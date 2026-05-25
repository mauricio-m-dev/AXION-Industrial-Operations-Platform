import { Request, Response, NextFunction } from "express";
import { log } from "../utils/logger";

/**
 * Wrapper for async route handlers to catch errors and pass them to next().
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Global error handling middleware.
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  
  // Para erros 500+ (erros internos do servidor), retornamos uma mensagem genérica 
  // para evitar vazamento de detalhes internos como nomes de conexões/erros do banco.
  const message = status < 500 ? (err.message || "Requisição inválida") : "Erro interno no servidor";
  
  if (status >= 500) {
    log(`Global Error: ${err.message || "Internal Server Error"}\nStack: ${err.stack}`, "ERROR");
  } else {
    log(`Client Error (${status}): ${err.message || "Client Error"}`, "WARN");
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && status < 500 && { stack: err.stack })
  });
};
