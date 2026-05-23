import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, LoginHistory } from "../models/mongoose";
import { log } from "../utils/logger";
import { logAudit } from "../utils/audit";
import { loginLimiter, incrementIpFailure, isLocalHostOrPrivateIP } from "../middleware/security";
import { loginSchema } from "../models/schemas";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import redisClient from "../config/redis";

/** Minimal shape of a user document for login finalization */
interface UserDocument {
  id: string;
  username: string;
  matricula: string;
  role: string;
  tokenVersion?: number;
  password: string;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  save: () => Promise<void>;
}

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    incrementIpFailure(req.ip);
    return res.status(400).json({ error: "Credenciais incompletas" });
  }
  const { matricula, password } = parsed.data;

  log(`Login attempt: ${matricula}`);

  try {
    const user = await User.findOne({ matricula });

    if (user) {
      // 1. Verificação de Bloqueio Progressivo
      const now = new Date();
      if (user.lockoutUntil && user.lockoutUntil > now) {
        const remaining = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / 60000);
        const tempo = remaining > 100000 ? "permanentemente" : `por ${remaining} minutos`;
        return res.status(401).json({ error: `Conta bloqueada ${tempo} devido a múltiplas tentativas falhas.` });
      }

      // 2. Verificação de Senha (Suporta Argon2id e fallback para bcrypt)
      let passwordMatch = false;
      if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
        passwordMatch = bcrypt.compareSync(password, user.password);
        if (passwordMatch) {
          // Migração silenciosa para Argon2id
          user.password = await argon2.hash(password);
          await user.save();
        }
      } else {
        try {
          passwordMatch = await argon2.verify(user.password, password);
        } catch (e) {
          passwordMatch = false;
        }
      }

      if (!passwordMatch) {
        // Incrementa falhas e aplica bloqueio se necessário
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 50) {
          user.lockoutUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // Permanente (100 anos)
        } else if (user.failedLoginAttempts >= 15) {
          user.lockoutUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora
        } else if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
        }
        await user.save();
        log(`Login FAIL: ${matricula}`, "ERROR");
        incrementIpFailure(req.ip);
        // Resposta genérica para evitar enumeração
        return res.status(401).json({ error: "Matrícula ou senha inválidos" });
      }

      // 3. Login com Sucesso
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save();

      const ip_address = req.ip || req.socket.remoteAddress || "Unknown";
      const device = req.headers["user-agent"] || "Unknown";

      // O MFA foi desativado a pedido do usuário. Segue direto para o login final.
      await finalizeLogin(user as unknown as UserDocument, ip_address, device, res);
      return;
    }

    // Se usuário não existe, resposta genérica
    log(`Login FAIL: ${matricula} (Not found)`, "ERROR");
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Matrícula ou senha inválidos" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Login DB Error: ${errMsg}`, "ERROR");
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

async function finalizeLogin(user: UserDocument, ip_address: string, device: string, res: Response) {
  log(`Login SUCCESS: ${user.username}`);
  try {
    await LoginHistory.create({ id: uuidv4(), username: user.username, ip_address, device });
    logAudit("LOGIN", user.username, { ip: ip_address, device });
  } catch (e) {
    log(`Failed to log login history: ${e}`, "ERROR");
  }

  const secret = process.env.JWT_SECRET!;
  const tokenVersion = user.tokenVersion || 0;
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'Usuário', tokenVersion },
    secret,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion },
    secret,
    { expiresIn: "7d" }
  );

  const isLocalhost = res.req ? isLocalHostOrPrivateIP(res.req.hostname) : false;

  // Define HttpOnly Cookies na resposta para maior segurança
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000 // 15 min
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: "lax",
    maxAge: 7 * 24 * 3600000 // 7 dias
  });

  return res.json({
    success: true,
    user: { id: user.id, username: user.username, matricula: user.matricula, role: user.role || 'Usuário' }
  });
}

router.post("/refresh", async (req, res) => {
  let refreshToken = req.body?.refreshToken;
  if (!refreshToken && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc: Record<string, string>, cookie: string) => {
      const [name, val] = cookie.split("=").map(c => c.trim());
      acc[name] = val;
      return acc;
    }, {});
    refreshToken = cookies["refresh_token"];
  }

  if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });
  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(refreshToken, secret, { algorithms: ["HS256"] }) as { id: string; tokenVersion?: number };
    const user = await User.findOne({ id: decoded.id });
    if (!user) return res.status(401).json({ error: "Usuário inexistente ou revogado" });

    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      logAudit("REFRESH_REVOKED", user.username, { expected: user.tokenVersion, received: decoded.tokenVersion });
      return res.status(401).json({ error: "Refresh token revogado pelo administrador" });
    }

    const newToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'Usuário', tokenVersion: user.tokenVersion || 0 },
      secret,
      { expiresIn: "15m" }
    );

    const isLocalhost = isLocalHostOrPrivateIP(req.hostname);
    res.cookie("access_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000
    });

    return res.json({ success: true });
  } catch (error) {
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Refresh token inválido, adulterado ou expirado" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GESTÃO DE BLACKLIST (SUPERADMIN)
// ═══════════════════════════════════════════════════════════════════════════════

router.delete("/blacklist/:ip", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const { ip } = req.params;
  if (!redisClient || !redisClient.isOpen) {
    return res.status(500).json({ error: "Redis indisponível" });
  }
  try {
    await redisClient.sRem("ip_blacklist", ip);
    await redisClient.del(`ip_fails:${ip}`);
    logAudit("IP_REMOVED_FROM_BLACKLIST", (req as any).user?.username || "SuperAdmin", { targetIp: ip });
    return res.json({ success: true, message: `IP ${ip} removido da blacklist.` });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover IP da blacklist" });
  }
});

export default router;
