import { Router, Response } from "express";
import { AuditLog, LoginHistory } from "../models/mongoose";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types/express";
import redisClient from "../config/redis";
import { publicLimiter } from "../middleware/security";
import { v4 as uuidv4 } from "uuid";
import { log } from "../utils/logger";

const router = Router();

router.get("/logs", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    try {
      const cached = await redisClient.get("api:audit:logs");
      if (cached) return res.json(JSON.parse(cached));
    } catch {}

    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean();

    try {
      await redisClient.setEx("api:audit:logs", 30, JSON.stringify(logs));
    } catch {}

    res.json(logs);
  } catch (error: unknown) {
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});

router.get("/login-history", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    try {
      const cached = await redisClient.get("api:audit:login-history");
      if (cached) return res.json(JSON.parse(cached));
    } catch {}

    const history = await LoginHistory.find().sort({ timestamp: -1 }).limit(500).lean();

    try {
      await redisClient.setEx("api:audit:login-history", 30, JSON.stringify(history));
    } catch {}

    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

router.post(["/click", "/audit/click"], publicLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target, url, action, username } = req.body;
    
    // Basic validation to prevent abuse and ensure type safety
    if (typeof target !== "string" || target.length > 200 || (url && typeof url !== "string") || (url && url.length > 500) || (action && typeof action !== "string")) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const logEntry = {
      id: `TRK-${uuidv4().substring(0, 8)}`,
      action: action || "UI_CLICK",
      username: username || req.user?.username || "Anônimo",
      details: { target, url },
      timestamp: new Date()
    };

    await AuditLog.create(logEntry);
    
    // Clear logs cache to ensure admin interface reflects new data
    try { await redisClient.del("api:audit:logs"); } catch {}

    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Tracker Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao registrar evento" });
  }
});

export default router;
