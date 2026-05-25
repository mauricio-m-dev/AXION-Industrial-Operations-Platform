import { Router, Response } from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { apiLimiter, localLimiter } from "../middleware/rateLimiters";
import { log } from "../utils/logger";
import type { AuthenticatedRequest } from "../types/express";
import { apmService } from "../services/ApmService";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.post("/flush-redis", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await apmService.flushRedis();
  res.json({ success: true, message: "Cache do Redis limpo com sucesso!" });
}));

router.get("/blacklist", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ips = await apmService.getBlacklist();
  res.json(ips);
}));

router.post("/maintenance", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const enabled = await apmService.toggleMaintenance(!!req.body.enabled);
  res.json({ success: true, maintenance: enabled });
}));

router.post("/test-notifications", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const message = await apmService.testNotifications(req.body.type, req.body.target);
  res.json({ success: true, message });
}));

router.get("/metrics/history", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const metrics = await apmService.getMetricsHistory(Number(req.query.hours) || 24);
  res.json(metrics);
}));

router.get("/reports", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reports = await apmService.getReports();
  res.json(reports);
}));

router.post("/reports/generate", requireAuth, requireSuperAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await apmService.generateReport(req.body.range || "24h", req.body.start, req.body.end, req.user.username);
  res.status(201).json(report);
}));



router.post("/clear-db", requireAuth, requireSuperAdmin, localLimiter, apiLimiter, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await apmService.clearDb(req.body.password, req.user, req.ip || "");
  res.json({ success: true, message: "Banco de dados limpo com sucesso." });
}));

export default router;
