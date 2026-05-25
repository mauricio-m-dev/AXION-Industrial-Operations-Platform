import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromFile } from "file-type";
import { UPLOAD_DIR } from "../server";
import { log } from "../utils/logger";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import { publicLimiter, apiLimiter } from "../middleware/rateLimiters";
import { ticketSchema, ticketUpdateSchema, ticketStatusSchema } from "../models/schemas";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis";
import type { AuthenticatedRequest } from "../types/express";
import { isMaintenanceMode } from "../utils/apmTracker";
import { ticketService } from "../services/TicketService";
import { asyncHandler } from "../middleware/errorHandler";
import { isValidImage } from "../utils/imageValidator";

const router = Router();

const localLimiter = rateLimit({
  store: process.env.NODE_ENV === "test" ? undefined : new RedisStore({
    prefix: "rl:ticket-local:",
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const SAFE_FILENAME_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|webp)$/i;

function safeDeleteUploadFile(rawInput: string): void {
  const filename = path.basename(rawInput);
  if (!SAFE_FILENAME_REGEX.test(filename)) return;
  const uploadsDir = path.resolve(UPLOAD_DIR);
  try {
    const existingFiles = fs.readdirSync(uploadsDir);
    if (existingFiles.includes(filename)) {
      fs.unlinkSync(path.join(uploadsDir, filename));
      log(`File deleted securely: ${filename}`);
    }
  } catch {}
}

function safeUnlinkReqFile(reqFile: Express.Multer.File | undefined): void {
  if (reqFile?.filename) safeDeleteUploadFile(reqFile.filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// deepcode ignore NoRateLimitingForExpensiveWebOperation: Protected by localLimiter, publicLimiter, and apiLimiter
router.post("/", localLimiter, publicLimiter, apiLimiter, upload.single("image"), asyncHandler(async (req: Request, res: Response) => {
  if (await isMaintenanceMode()) {
    safeUnlinkReqFile(req.file);
    return res.status(503).json({ error: "O sistema está em manutenção programada." });
  }

  if (req.file) {
    if (!isValidImage(req.file.originalname, req.file.mimetype)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Extensão de arquivo não permitida." });
    }
    const meta = await fileTypeFromFile(req.file.path);
    if (meta && !['image/jpeg', 'image/png', 'image/webp'].includes(meta.mime)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Arquivo inválido ou não é uma imagem." });
    }
  }

  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.format() });
  }

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;
  const ticketId = await ticketService.createTicket(parsed.data, image_path, parsed.data.operator_name || "Operator");
  
  res.status(201).json({ success: true, ticketId });
}));

router.get("/stats", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await ticketService.getStats(req.user);
  res.json(stats);
}));

router.get("/export", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const csvStr = await ticketService.exportCSV(req.user);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.csv"');
  res.status(200).send(csvStr);
}));

router.get("/", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(String(req.query.page || "1"), 10) || 1;
  const limit = parseInt(String(req.query.limit || "0"), 10) || 0;
  
  const filter = ticketService.buildFilter(req.query, req.user);

  if (limit > 0) {
    const paginated = await ticketService.getPaginatedTickets(filter, page, limit);
    return res.json(paginated);
  }

  const tickets = await ticketService.getTickets(filter);
  res.json(tickets);
}));

router.patch("/:id/status", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user.role === "Usuário") {
    return res.status(403).json({ error: "Usuários não podem alterar status." });
  }
  const parsed = ticketStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Status inválido." });

  await ticketService.updateStatus(req.params.id, parsed.data.status, req.user);
  res.json({ success: true });
}));

router.patch("/:id/start", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user.role === "Usuário") {
    return res.status(403).json({ error: "Usuários não podem iniciar atendimento." });
  }
  let assigned_to = req.body.assigned_to;
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
    assigned_to = req.user.username;
  }
  if (!assigned_to) return res.status(400).json({ error: "Responsável obrigatório" });

  const assigned = await ticketService.startTicket(req.params.id, assigned_to, req.user);
  res.json({ success: true, assigned_to: assigned });
}));

const handleResolutionUpload = (req: AuthenticatedRequest, res: Response, next: any) => {
  upload.single("resolution_image")(req, res, (err: unknown) => {
    if (err) return res.status(413).json({ error: "Arquivo excede 5MB" });
    next();
  });
};

// deepcode ignore NoRateLimitingForExpensiveWebOperation: Protected by localLimiter and apiLimiter
router.patch("/:id/finish", requireAuth, localLimiter, apiLimiter, handleResolutionUpload, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user.role === "Usuário") {
    safeUnlinkReqFile(req.file);
    return res.status(403).json({ error: "Usuários não podem finalizar chamados." });
  }
  const { resolution_report } = req.body;
  if (!resolution_report) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Relatório obrigatório" });
  }
  if (typeof resolution_report === 'string' && (resolution_report.includes("<script>") || resolution_report.includes("javascript:"))) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Conteúdo malicioso detectado no relatório." });
  }

  if (req.file) {
    if (!isValidImage(req.file.originalname, req.file.mimetype)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Extensão de arquivo não permitida." });
    }
    const meta = await fileTypeFromFile(req.file.path);
    if (meta && !['image/jpeg', 'image/png', 'image/webp'].includes(meta.mime)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Arquivo inválido ou não é uma imagem." });
    }
  }

  const resolution_image_path = req.file ? `/uploads/${req.file.filename}` : null;
  await ticketService.finishTicket(req.params.id, resolution_report, resolution_image_path, req.user);
  res.json({ success: true });
}));

router.put("/:id", requireAuth, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ticketUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  await ticketService.updateTicket(req.params.id, parsed.data, req.user);
  res.json({ success: true });
}));

// deepcode ignore NoRateLimitingForExpensiveWebOperation: Protected by localLimiter and apiLimiter
router.delete("/:id", requireAuth, requireAdmin, localLimiter, apiLimiter, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const filesToDelete = await ticketService.deleteTicket(req.params.id, req.user);
  for (const fp of filesToDelete) {
    try { safeDeleteUploadFile(fp); } catch {}
  }
  res.json({ success: true });
}));

export default router;
