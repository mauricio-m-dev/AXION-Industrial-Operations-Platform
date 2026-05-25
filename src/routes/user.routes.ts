import { Router, Response } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { userSchema } from "../models/schemas";
import type { AuthenticatedRequest } from "../types/express";
import { userService } from "../services/UserService";
import { asyncHandler } from "../middleware/errorHandler";
import { CircuitBreaker } from "../utils/circuitBreaker";
import redisClient from "../config/redis";

const router = Router();
const redisBreaker = new CircuitBreaker("redis-users", 3, 10000);

router.post("/", requireAuth, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos ou senha curta" });

  const user = await userService.createUser(parsed.data, req.user);
  res.json({ success: true, user });
}));

router.get("/", requireAuth, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 0;
  if (limit > 1000) return res.status(400).json({ error: "Limite máximo de registros excedido." });

  try {
    const cached = await redisBreaker.fire(
      () => redisClient.get("api:users:list"),
      () => Promise.resolve(null)
    );
    if (cached) return res.json(JSON.parse(cached));
  } catch {}

  const users = await userService.getUsers();

  try {
    await redisBreaker.fire(
      () => redisClient.setEx("api:users:list", 60, JSON.stringify(users)),
      () => Promise.resolve("")
    );
  } catch {}

  res.json(users);
}));

router.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await userService.deleteUser(req.params.id, req.user);
  res.json({ success: true });
}));

router.put("/:id", requireAuth, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.json({ success: true, user });
}));

export default router;
