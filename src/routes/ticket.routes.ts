// file-deepcode ignore NoRateLimitingForExpensiveWebOperation: Routes protected by express-rate-limit middleware (apiLimiter)
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromFile } from "file-type";
import { UPLOAD_DIR } from "../server";
import { Ticket, User } from "../models/mongoose";
import { log } from "../utils/logger";
import { logAudit } from "../utils/audit";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import { publicLimiter, apiLimiter } from "../middleware/security";
import { ticketSchema } from "../models/schemas";
import { notifyUsersAboutTicket, notifyUsersAboutTicketFinished } from "../utils/notifications";
import { getIO, emitSelectiveTicketsUpdated } from "../socket";
import rateLimit from "express-rate-limit";
import type { AuthenticatedRequest } from "../types/express";
import redisClient from "../config/redis";
import { CircuitBreaker } from "../utils/circuitBreaker";
import { isMaintenanceMode } from "../utils/apmTracker";

// Local limiter to satisfy Snyk Code analysis that requires rateLimit in the same file
const localLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});


const TICKETS_CACHE_KEY = "api:tickets:all";
const redisBreaker = new CircuitBreaker("RedisCache", 3, 10000);

const TICKETS_STATS_CACHE_KEY = "api:tickets:stats";

const clearTicketsCache = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(TICKETS_CACHE_KEY);
      await redisClient.del(TICKETS_STATS_CACHE_KEY);
    }
  } catch (err) {
    log(`Redis Cache Clear Error: ${err}`, "ERROR");
  }
};

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite estrito de 5MB para prevenir Out of Memory (OOM)
});

// Regex estrita: UUID + extensão de imagem (gerado pelo nosso multer storage)
const SAFE_FILENAME_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|webp)$/i;

/**
 * Remove com segurança um arquivo do diretório de uploads.
 * O filename é validado contra um regex estrito (UUID) e verificado
 * contra o listing real do diretório — eliminando qualquer possibilidade
 * de Path Traversal, pois o argumento de fs.unlinkSync nunca vem
 * diretamente do input do usuário.
 */
function safeDeleteUploadFile(rawInput: string): void {
  // Extrair apenas o basename, descartando path components
  const filename = path.basename(rawInput);
  // Validar formato estrito (UUID gerado pelo servidor)
  if (!SAFE_FILENAME_REGEX.test(filename)) {
    log(`Blocked file deletion — invalid filename format: ${filename}`, "WARN");
    return;
  }
  // Confirmar existência via listing do diretório (server-controlled)
  const uploadsDir = path.resolve(UPLOAD_DIR);
  let existingFiles: string[];
  try {
    // snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
    existingFiles = fs.readdirSync(uploadsDir);
  } catch {
    return;
  }
  if (!existingFiles.includes(filename)) {
    return;
  }
  // Construir caminho seguro usando dados do servidor, não do usuário
  const targetPath = path.join(uploadsDir, filename);
  // snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
  fs.unlinkSync(targetPath);
  log(`File deleted securely: ${targetPath}`);
}

/**
 * Remove com segurança o arquivo de upload associado a um objeto `req.file` do multer.
 */
function safeUnlinkReqFile(reqFile: Express.Multer.File | undefined): void {
  if (!reqFile?.filename) return;
  safeDeleteUploadFile(reqFile.filename);
}

// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
router.post("/", localLimiter, publicLimiter, apiLimiter, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (await isMaintenanceMode()) {
      safeUnlinkReqFile(req.file);
      return res.status(503).json({ error: "O sistema está em manutenção programada. Por favor, tente novamente em alguns minutos." });
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        safeUnlinkReqFile(req.file);
        log(`Ticket Creation Failed: Invalid extension ${ext}`, "WARN");
        return res.status(400).json({ error: "Extensão de arquivo não permitida." });
      }
      const meta = await fileTypeFromFile(req.file.path);
      if (meta && !['image/jpeg', 'image/png', 'image/webp'].includes(meta.mime)) {
        safeUnlinkReqFile(req.file);
        log(`Ticket Creation Failed: Invalid mime ${meta?.mime}`, "WARN");
        return res.status(400).json({ error: "Arquivo inválido ou não é uma imagem." });
      }
    }
    const parsed = ticketSchema.safeParse(req.body);
    if (!parsed.success) {
      safeUnlinkReqFile(req.file);
      log(`Ticket Validation Failed: ${JSON.stringify(parsed.error.format())}`, "ERROR");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.format() });
    }
    const { type, location, agv_number, part_name, sap_number, side, observation, operator_name, operator_matricula, impact, downtime } = parsed.data;
    const id = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    let priority = "Baixo";
    const isCriticalLoc = ["ASSEMBLY-01", "BODY-SHOP", "QC-LINE"].includes(location);
    // REGRA: Todo chamado de Colisão é automaticamente Crítico
    if (type === "Colisão") priority = "Crítico";
    else if (impact === "total") priority = "Crítico";
    else if (impact === "partial") priority = isCriticalLoc || type === "AGV com falha" ? "Alto" : "Médio";
    else if (type === "AGV com falha" && isCriticalLoc) priority = "Alto";
    else if (type === "AGV com falha") priority = "Médio";
    else if (type === "Falta de peças" || type === "Painel/Botoeira") priority = "Médio";

    await Ticket.create({
      id, type, location, agv_number, part_name, sap_number, side, observation, image_path, operator_name, operator_matricula, priority, operational_impact: impact, downtime
    });

    logAudit("OPEN_TICKET", operator_name || "Operator", { ticketId: id, type });

    // Enviar notificações configuradas (WhatsApp/Email/Discord)
    await notifyUsersAboutTicket({ id, type, location, impact, operator_name }, priority);

    // Disparar evento WebSocket para atualizar clients
    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(type); } catch(e) {}

    res.status(201).json({ success: true, ticketId: id });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Create Ticket Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao registrar chamado" });
  }
});

// Endpoint de estatísticas rápidas para dashboard
router.get("/stats", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const baseQuery: any = {};
    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      baseQuery.type = { $in: allowedTypes };
    }

    // Check Redis cache for stats (only when no moderator filter)
    const useStatsCache = Object.keys(baseQuery).length === 0;
    if (useStatsCache) {
      try {
        const cached = await redisBreaker.fire(
          () => redisClient.get(TICKETS_STATS_CACHE_KEY),
          () => Promise.resolve(null)
        );
        if (cached) return res.json(JSON.parse(cached));
      } catch {}
    }

    // Single aggregation instead of 6 sequential countDocuments
    const matchStage = Object.keys(baseQuery).length > 0 ? [{ $match: baseQuery }] : [];
    const statusPipeline = [
      ...matchStage,
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ];
    const priorityPipeline = [
      ...matchStage,
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ];
    const [statusCounts, priorityCounts] = await Promise.all([
      Ticket.aggregate(statusPipeline),
      Ticket.aggregate(priorityPipeline)
    ]);

    const statusMap: Record<string, number> = {};
    for (const item of statusCounts) {
      statusMap[item._id || "Unknown"] = item.count;
    }
    const priorityMap: Record<string, number> = {};
    for (const item of priorityCounts) {
      priorityMap[item._id || "Unknown"] = item.count;
    }

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const open = statusMap["Aberto"] || 0;
    const pending = statusMap["Em atendimento"] || 0;
    const finished = statusMap["Finalizado"] || 0;
    const critical = priorityMap["Crítico"] || 0;
    const high = priorityMap["Alto"] || 0;

    const statsResponse = { total, open, pending, finished, critical, high };

    // Cache stats result with 30s TTL
    if (useStatsCache) {
      try {
        await redisBreaker.fire(
          () => redisClient.setEx(TICKETS_STATS_CACHE_KEY, 30, JSON.stringify(statsResponse)),
          () => Promise.resolve("")
        );
      } catch {}
    }

    res.json(statsResponse);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Fetch Stats Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// Endpoint de exportação CSV
router.get("/export", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const baseQuery: any = {};
    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      baseQuery.type = { $in: allowedTypes };
    }
    const tickets = await Ticket.find(baseQuery).sort({ created_at: -1 }).lean();
    
    // Header do CSV
    let csvStr = "ID,Type,Status,Priority,Location,Operator,Matricula,Created_At,Resolved_At,MTTR_Min\n";
    
    tickets.forEach((t: any) => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      const createdAt = new Date(t.created_at).toISOString();
      const resolvedAt = t.resolved_at ? new Date(t.resolved_at).toISOString() : "";
      
      let mttr = "";
      if (t.created_at && t.resolved_at) {
        mttr = Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000).toString();
      }

      csvStr += `${t.id},${escape(t.type)},${t.status},${t.priority},${escape(t.location)},${escape(t.operator_name)},${escape(t.operator_matricula)},${createdAt},${resolvedAt},${mttr}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.csv"');
    res.status(200).send(csvStr);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Export Tickets Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao exportar dados" });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || "1"), 10) || 1;
    const limit = parseInt(String(req.query.limit || "0"), 10) || 0;
    
    // Validação de tipo estrita para todos os parâmetros de query
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
    
    let search = "";
    const qSearch = req.query.search;
    if (typeof qSearch === "string") {
      // snyk-disable-next-line HTTPSourceWithUncheckedType
      search = qSearch.replace(/[${}]/g, "");
    }
    const start = typeof req.query.start === "string" ? req.query.start : undefined;
    const end = typeof req.query.end === "string" ? req.query.end : undefined;

    // Construção do objeto de filtro dinâmico
    const filter: any = {};
    if (status && status !== 'all') {
      const statusList = (status as string).split(',');
      if (statusList.length > 1) {
        filter.status = { $in: statusList };
      } else {
        filter.status = status;
      }
    }
    const isModerador = req.user.role === "Moderador";
    let allowedTypes: string[] = [];
    if (isModerador) {
      const userDoc = await User.findOne({ username: req.user.username });
      allowedTypes = userDoc?.allowedTicketTypes || [];
    }

    if (type && type !== 'all') {
      const typeStr = String(type);
      if (isModerador) {
        filter.type = allowedTypes.includes(typeStr) ? typeStr : { $in: [] };
      } else {
        filter.type = typeStr;
      }
    } else if (isModerador) {
      filter.type = { $in: allowedTypes };
    }

    if (priority && priority !== 'all') filter.priority = String(priority);
    
    if (search) {
      // Usar busca segura com $regex como string (não como objeto do usuário)
      const sanitizedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { id: { $regex: sanitizedSearch, $options: "i" } },
        { location: { $regex: sanitizedSearch, $options: "i" } },
        { operator_name: { $regex: sanitizedSearch, $options: "i" } },
        { operator_matricula: { $regex: sanitizedSearch, $options: "i" } }
      ];
    }

    if (start || end) {
      filter.created_at = {};
      if (start) filter.created_at.$gte = new Date(start);
      if (end) filter.created_at.$lte = new Date(end);
    }

    // Se houver limit, aplica paginação
    if (limit > 0) {
      const skip = (page - 1) * limit;
      const total = await Ticket.countDocuments(filter);
      const tickets = await Ticket.find(filter)
        .select('-resolution_report -images -__v')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return res.json({
        data: tickets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    // Fallback para Analytics (busca todos os filtrados)
    // Usamos cache apenas para a busca completa sem filtros específicos de busca por texto
    const useCache = !isModerador && !search && !start && !end && (!status || status === 'all') && (!type || type === 'all');
    
    if (useCache && redisClient.isOpen) {
      try {
        const cachedData = await redisBreaker.fire(
          async () => await redisClient.get(TICKETS_CACHE_KEY)
        );
        if (cachedData) return res.json(JSON.parse(cachedData));
      } catch (redisError: unknown) {
        const errMsg = redisError instanceof Error ? redisError.message : String(redisError);
        log(`Redis Get Error (Failover activated): ${errMsg}`, "WARN");
      }
    }

    const tickets = await Ticket.find(filter).select('-resolution_report -images -__v').sort({ created_at: -1 }).lean();

    if (useCache && redisClient.isOpen) {
      try {
        await redisBreaker.fire(
          async () => await redisClient.setEx(TICKETS_CACHE_KEY, 300, JSON.stringify(tickets))
        );
      } catch (redisError: unknown) {
        const errMsg = redisError instanceof Error ? redisError.message : String(redisError);
        log(`Redis Set Error: ${errMsg}`, "WARN");
      }
    }

    res.json(tickets);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Fetch Tickets Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

router.patch("/:id/status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

    if (req.user.role === "Usuário") {
      return res.status(403).json({ error: "Acesso negado: Usuários não podem alterar o status de chamados." });
    }

    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      if (!allowedTypes.includes(ticket.type)) {
        return res.status(403).json({ error: "Acesso negado: Tipo de chamado não permitido para o seu perfil." });
      }
    }

    await Ticket.updateOne({ id }, { status });
    logAudit("CHANGE_STATUS", req.user.username, { ticketId: id, newStatus: status });
    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(ticket.type); } catch(e) {}
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Update Status Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro na atualização" });
  }
});

router.patch("/:id/start", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { assigned_to } = req.body;
    
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      assigned_to = req.user.username;
    }

    if (!assigned_to) return res.status(400).json({ error: "Responsável obrigatório" });
    
    const targetTicket = await Ticket.findOne({ id: req.params.id });
    if (!targetTicket) return res.status(404).json({ error: "Chamado não encontrado" });

    if (req.user.role === "Usuário") {
      return res.status(403).json({ error: "Acesso negado: Usuários não podem iniciar atendimento de chamados." });
    }

    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      if (!allowedTypes.includes(targetTicket.type)) {
        return res.status(403).json({ error: "Acesso negado: Tipo de chamado não permitido para o seu perfil." });
      }
    }

    const result = await Ticket.updateOne(
      { id: req.params.id, status: 'Aberto' },
      { status: 'Em atendimento', assigned_to, started_at: new Date() }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({ error: "Chamado já foi assumido por outro usuário ou não está mais aberto" });
    }

    logAudit("START_SERVICE", req.user.username, { ticketId: req.params.id, assignedTo: assigned_to });
    log(`Ticket ${req.params.id} started by ${assigned_to}`);
    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(targetTicket.type); } catch(e) {}
    res.json({ success: true, assigned_to });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Start Ticket Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao iniciar atendimento" });
  }
});

const handleResolutionUpload = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  upload.single("resolution_image")(req, res, (err: unknown) => {
    if (err) {
      return res.status(413).json({ error: "Arquivo excede o tamanho máximo permitido (5MB)" });
    }
    next();
  });
};

// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
router.patch("/:id/finish", requireAuth, localLimiter, apiLimiter, handleResolutionUpload, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resolution_report } = req.body;
    const resolution_image_path = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (!resolution_report) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Relatório de resolução é obrigatório" });
    }

    if (typeof resolution_report === 'string' && (resolution_report.includes("<script>") || resolution_report.includes("javascript:"))) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Conteúdo malicioso detectado no relatório." });
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        safeUnlinkReqFile(req.file);
        return res.status(400).json({ error: "Extensão de arquivo não permitida." });
      }
      const meta = await fileTypeFromFile(req.file.path);
      if (meta && !['image/jpeg', 'image/png', 'image/webp'].includes(meta.mime)) {
        safeUnlinkReqFile(req.file);
        return res.status(400).json({ error: "Arquivo inválido ou não é uma imagem." });
      }
    }

    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) {
      safeUnlinkReqFile(req.file);
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    
    if (req.user.role === "Usuário") {
      safeUnlinkReqFile(req.file);
      return res.status(403).json({ error: "Acesso negado: Usuários não podem finalizar chamados." });
    }

    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      if (!allowedTypes.includes(ticket.type)) {
        safeUnlinkReqFile(req.file);
        return res.status(403).json({ error: "Acesso negado: Tipo de chamado não permitido para o seu perfil." });
      }
    }

    if (req.user.role !== "SuperAdmin" && req.user.role !== "Admin" && ticket.assigned_to !== req.user.username) {
      safeUnlinkReqFile(req.file);
      return res.status(403).json({ error: "Apenas o responsável, Admin ou SuperAdmin podem finalizar este chamado" });
    }

    const finishedAt = new Date();
    await Ticket.updateOne(
      { id: req.params.id },
      { status: 'Finalizado', finished_at: finishedAt, resolution_report, resolution_image_path }
    );
    
    logAudit("FINISH_SERVICE", req.user.username, { ticketId: req.params.id });
    log(`Ticket ${req.params.id} finished by ${req.user.username}`);

    // Enviar alerta de finalização com relatório para todos os gestores (WhatsApp + Email)
    await notifyUsersAboutTicketFinished({
      id: ticket.id,
      type: ticket.type,
      location: ticket.location,
      priority: ticket.priority,
      operator_name: ticket.operator_name,
      assigned_to: ticket.assigned_to,
      created_at: ticket.get('created_at'),
      finished_at: finishedAt,
      resolution_report,
      finished_by: req.user.username
    });

    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(ticket.type); } catch(e) {}
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Finish Ticket Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao finalizar atendimento" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, location, priority, operational_impact, downtime, observation } = req.body;
    await Ticket.updateOne(
      { id: req.params.id },
      { type, location, priority, operational_impact, downtime, observation }
    );
    logAudit("EDIT_TICKET", req.user.username, { ticketId: req.params.id, updates: req.body });
    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(type); } catch(e) {}
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Edit Ticket Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao editar chamado" });
  }
});

// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
router.delete("/:id", requireAuth, requireAdmin, localLimiter, apiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Sanitizar o parâmetro de ID para prevenir NoSQL injection
    const ticketId = String(req.params.id).replace(/[${}]/g, "");
    const ticket = await Ticket.findOne({ id: ticketId });
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

    // Apagar arquivos físicos associados (foto inicial e foto de resolução)
    const filePaths: string[] = [];
    if (typeof ticket.image_path === "string" && ticket.image_path) filePaths.push(ticket.image_path);
    if (typeof ticket.resolution_image_path === "string" && ticket.resolution_image_path) filePaths.push(ticket.resolution_image_path);
    
    for (const fp of filePaths) {
      try {
        safeDeleteUploadFile(fp);
      } catch (err) {
        log(`Error deleting file: ${err}`, "ERROR");
      }
    }

    await Ticket.deleteOne({ id: ticketId });
    logAudit("DELETE_TICKET", req.user.username, { ticketId });
    log(`Ticket ${ticketId} deleted by ${req.user.username}`);
    try { await clearTicketsCache(); await emitSelectiveTicketsUpdated(ticket.type); } catch(e) {}
    
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Delete Ticket Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao excluir chamado" });
  }
});

export default router;
