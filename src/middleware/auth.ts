import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/mongoose";
import { logAudit } from "../utils/audit";
import { incrementIpFailure } from "./security";
import type { AuthUser } from "../types/express";
import redisClient from "../config/redis";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token = "";
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc: Record<string, string>, cookie: string) => {
      const idx = cookie.indexOf("=");
      if (idx > 0) {
        acc[cookie.substring(0, idx).trim()] = cookie.substring(idx + 1).trim();
      }
      return acc;
    }, {});
    token = cookies["access_token"] || "";
  }
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const extracted = authHeader.split(" ")[1];
      if (extracted !== "undefined" && extracted !== "null") token = extracted;
    }
  }

  if (!token) {
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Acesso negado: Token ausente" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET!;
    // Proteção contra JWT tampering e Algorithm Confusion
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as Record<string, unknown>;
    const username = String(decoded.username);
    
    // Check cache first
    const cacheKey = `user:auth:${username}`;
    let userDoc: any = null;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) userDoc = JSON.parse(cached);
    } catch (e) {
      // ignore redis errors and fall back to DB
    }

    if (!userDoc) {
      // Consulta à verdade absoluta do banco de dados (Server-Side verification)
            const dbUserQuery = User.findOne({ username });
      const dbUser = typeof (dbUserQuery as any).lean === "function" ? await (dbUserQuery as any).lean() : await dbUserQuery;
      if (!dbUser) {
        logAudit("AUTH_REVOKED", username, { reason: "User account not found in database" });
        incrementIpFailure(req.ip);
        return res.status(401).json({ error: "Conta de usuário inexistente ou desativada" });
      }
      userDoc = dbUser;
      
      try {
        await redisClient.setEx(cacheKey, 60, JSON.stringify(userDoc));
      } catch (e) {
        // ignore redis errors
      }
    }

    // Proteção com tokenVersion para invalidação imediata de sessões
    if (decoded.tokenVersion !== undefined && userDoc.tokenVersion !== decoded.tokenVersion) {
      logAudit("TOKEN_VERSION_MISMATCH", String(decoded.username), { expected: userDoc.tokenVersion, received: decoded.tokenVersion });
      incrementIpFailure(req.ip);
      return res.status(401).json({ error: "Sessão expirada ou revogada pelo administrador" });
    }

    // Injeta os privilégios estritos direto do servidor, ignorando a role declarada no token
    (req as any).user = {
      ...decoded,
      role: userDoc.role,
      allowedTicketTypes: userDoc.allowedTicketTypes || [],
      tokenVersion: userDoc.tokenVersion
    } as AuthUser;

    next();
  } catch (error) {
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Token inválido, adulterado ou expirado" });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "SuperAdmin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "SuperAdmin", currentRole: user?.role });
    incrementIpFailure(req.ip);
    return res.status(403).json({ error: "Acesso restrito ao SuperAdmin" });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "SuperAdmin" && user?.role !== "Admin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "Admin", currentRole: user?.role });
    incrementIpFailure(req.ip);
    return res.status(403).json({ error: "Acesso restrito a Administradores" });
  }
  next();
};
