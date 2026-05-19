import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { OperatorFeedback } from "../models/mongoose";
import { log } from "../utils/logger";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import { publicLimiter } from "../middleware/security";
import { feedbackSchema } from "../models/schemas";
import type { AuthenticatedRequest } from "../types/express";

const router = Router();

router.post("/", publicLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    const { matricula, name, feedback } = parsed.data;
    const id = uuidv4();
    await OperatorFeedback.create({ id, matricula, name, feedback });
    log(`Feedback recebido de: ${name}`);
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Create Feedback Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao enviar feedback" });
  }
});

router.get("/", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbacks = await OperatorFeedback.find().sort({ created_at: -1 }).lean();
    res.json(feedbacks);
  } catch (error: unknown) {
    res.status(500).json({ error: "Erro ao buscar feedbacks" });
  }
});

export default router;
