import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/mongoose";
import { logAudit } from "../utils/audit";
import type { AuthUser } from "../types/express";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc: Record<string, string>, cookie: string) => {
      const [name, val] = cookie.split("=").map(c => c.trim());
      acc[name] = val;
      return acc;
    }, {});
    token = cookies["access_token"] || "";
  }

  if (!token) {
    return res.status(401).json({ error: "Acesso negado: Token ausente" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET!;
    // Proteção contra JWT tampering e Algorithm Confusion
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as Record<string, unknown>;
    
    // Consulta à verdade absoluta do banco de dados (Server-Side verification)
    const userDoc = await User.findOne({ username: decoded.username });
    if (!userDoc) {
      logAudit("AUTH_REVOKED", String(decoded.username), { reason: "User account not found in database" });
      return res.status(401).json({ error: "Conta de usuário inexistente ou desativada" });
    }

    // Proteção com tokenVersion para invalidação imediata de sessões
    if (decoded.tokenVersion !== undefined && userDoc.tokenVersion !== decoded.tokenVersion) {
      logAudit("TOKEN_VERSION_MISMATCH", String(decoded.username), { expected: userDoc.tokenVersion, received: decoded.tokenVersion });
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
    return res.status(401).json({ error: "Token inválido, adulterado ou expirado" });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "SuperAdmin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "SuperAdmin", currentRole: user?.role });
    return res.status(403).json({ error: "Acesso restrito ao SuperAdmin" });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "SuperAdmin" && user?.role !== "Admin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "Admin", currentRole: user?.role });
    return res.status(403).json({ error: "Acesso restrito a Administradores" });
  }
  next();
};
