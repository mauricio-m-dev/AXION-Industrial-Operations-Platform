import type { Request, Response, NextFunction } from "express";

// ═══════════════════════════════════════════════════════════════════════════════
// Express Request Extensions — Used by requireAuth middleware
// ═══════════════════════════════════════════════════════════════════════════════

/** The user object injected into req.user by requireAuth middleware */
export interface AuthUser {
  id: string;
  username: string;
  role: "SuperAdmin" | "Admin" | "Moderador" | "Usuário";
  allowedTicketTypes: string[];
  tokenVersion: number;
  matricula?: string;
}

/** Express Request with authenticated user */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/** Typed Express route handler for authenticated routes */
export type AuthHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;
