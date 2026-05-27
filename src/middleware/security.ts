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

export function isLocalHostOrPrivateIP(hostname: string): boolean {
  try {
    let ip = hostname;
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }
    if (ip === "localhost" || ip === "127.0.0.1" || ip === "::1" || ip.endsWith(".local")) {
      return true;
    }
    const parts = ip.split(".");
    if (parts.length === 4) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      if (first === 10) return true;
      if (first === 192 && second === 168) return true;
      if (first === 172 && second >= 16 && second <= 31) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return isLocalHostOrPrivateIP(url.hostname);
  } catch {
    return false;
  }
}

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
    
    const defaultLocalOrigins = [
      'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 
      'https://localhost', 'https://127.0.0.1', 'http://localhost',
      'http://localhost:8080', 'https://localhost:8443', 'http://localhost:80'
    ];
    
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? [...process.env.CORS_ORIGINS.split(','), ...defaultLocalOrigins] 
      : defaultLocalOrigins;
    
    if (origin && !allowedOrigins.includes('*') && !allowedOrigins.includes(origin) && !isLocalOrigin(origin)) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ANTI-BRUTE FORCE — Redis IP Blacklist
// ═══════════════════════════════════════════════════════════════════════════════

export const checkIpBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  // Desativado para evitar bloqueio em massa de redes móveis (CGNAT/Compartilhadas).
  // A segurança permanece ativa via bloqueio individual de conta (lockout) e rate limiting.
  next();
};

export const incrementIpFailure = async (ip?: string) => {
  if (!redisClient || !redisClient.isOpen || !ip) return;
  try {
    if (isLocalHostOrPrivateIP(ip)) {
      return;
    }
    const key = `ip_fails:${ip}`;
    const failures = await redisClient.incr(key);
    if (failures === 1) {
      await redisClient.expire(key, 3600); // reseta falhas em 1 hora
    }
    if (failures >= 4) {
      log(`IP adicionado à Blacklist permanente (Anti-Brute Force): ${ip}`, "ERROR");
      await redisClient.sAdd("ip_blacklist", ip);
    }
  } catch (err) {
    log(`Erro no Tracker de Blacklist: ${err}`, "ERROR");
  }
};
