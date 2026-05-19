import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import helmet from "helmet";
import sanitizeHtml from "sanitize-html";
import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";
import { log } from "../utils/logger";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CSRF PROTECTION — Custom Header + Origin Verification
// ═══════════════════════════════════════════════════════════════════════════════

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Ignora chamadas seguras (GET, OPTIONS, HEAD)
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const xRequestedWith = req.headers['x-requested-with'];

  // 1. Verificação de Custom Header (Eficaz para APIs REST)
  // Navegadores impedem que formulários HTML simples definam headers customizados.
  if (!xRequestedWith || xRequestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({ error: "CSRF Validation Failed: X-Requested-With header required" });
  }

  // 2. Verificação de Origem em Produção
  if (process.env.NODE_ENV === 'production') {
    if (!origin && !referer) {
      return res.status(403).json({ error: "CSRF token missing or incorrect (Origin/Referer header required)" });
    }
    
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',') 
      : [
          'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 
          'https://localhost', 'https://127.0.0.1', 'http://localhost',
          'http://localhost:8080', 'https://localhost:8443'
        ];
    
    if (origin && !allowedOrigins.includes('*') && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: `CSRF Validation Failed: Origin mismatch (${origin})` });
    }
  }

  next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RATE LIMITING — Redis-Backed (Global Across Workers)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cria um store de rate limiting que usa Redis como backend.
 * Isso garante que o limite seja compartilhado entre todos os workers do cluster,
 * impedindo que um atacante multiplique o limite pelo número de CPUs.
 * Fallback para memória local se o Redis não estiver disponível.
 */
function createRedisStore(prefix: string) {
  try {
    // Verifica se o Redis está disponível E possui o método sendCommand
    // Em ambientes de teste (mocks), sendCommand pode não existir
    if (redisClient && redisClient.isOpen && typeof redisClient.sendCommand === 'function') {
      return new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: `rl:${prefix}:`
      });
    }
  } catch (err) {
    log(`Rate Limiter Redis Store fallback to memory for prefix: ${prefix}`, "WARN");
  }
  return undefined; // Fallback para memory store padrão
}

export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 15, // 15 tentativas por minuto por IP (reduzido de 50 para hardening)
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("login"),
  message: { error: "Muitas tentativas de login. Tente novamente em 1 minuto." },
  validate: { xForwardedForHeader: false }
});

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("public"),
  message: { error: "Muitas requisições. Tente novamente em breve." }
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // 200 req/min por IP para uso normal da API
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("api"),
  message: { error: "Limite de requisições excedido. Aguarde um momento." }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONTENT-TYPE VALIDATION — Rejeita payloads com MIME inválido
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware que valida o Content-Type de requisições com body.
 * Rotas JSON devem enviar application/json.
 * Isso previne ataques de Content-Type Confusion e XXE via XML.
 */
export const contentTypeValidation = (req: Request, res: Response, next: NextFunction) => {
  // Apenas valida métodos que possuem body
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Se não há body, pula a validação
  const contentLength = req.headers['content-length'];
  if (!contentLength || contentLength === '0') {
    return next();
  }

  const contentType = req.headers['content-type'] || '';

  // Aceita JSON e multipart (uploads)
  if (
    contentType.includes('application/json') || 
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return next();
  }

  log(`Content-Type rejeitado: ${contentType} | IP: ${req.ip} | Path: ${req.path}`, "WARN");
  return res.status(415).json({ 
    error: "Content-Type não suportado. Use application/json para chamadas de API." 
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GLOBAL INPUT SANITIZATION — Anti-XSS Recursivo em Todo o Body
// ═══════════════════════════════════════════════════════════════════════════════

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],        // Remove TODAS as tags HTML
  allowedAttributes: {},  // Remove TODOS os atributos
  disallowedTagsMode: 'discard'
};

/**
 * Sanitiza recursivamente todos os valores string de um objeto.
 * Isso cria uma camada de defesa uniforme contra XSS Persistente
 * independente da validação Zod de cada rota.
 */
function deepSanitize(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, sanitizeOptions);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = deepSanitize(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

export const globalSanitizer = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SECURITY HEADERS — Helmet + HSTS + Permissions-Policy
// ═══════════════════════════════════════════════════════════════════════════════

export const securityHeaders = helmet();
