import { Router, Response } from "express";
import { AuditLog, LoginHistory } from "../models/mongoose";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types/express";

const router = Router();

router.get("/logs", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean();
    res.json(logs);
  } catch (error: unknown) {
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});

router.get("/login-history", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await LoginHistory.find().sort({ timestamp: -1 }).limit(500).lean();
    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

export default router;
