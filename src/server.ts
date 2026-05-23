// file-deepcode ignore NoRateLimitingForExpensiveWebOperation: Protected by express-rate-limit middleware (apiLimiter)
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import "dotenv/config";
import { connectMongoDB } from "./config/mongo";
import redisClient, { connectRedis } from "./config/redis";
import mongoose from "mongoose";
import os from "os";
import cluster from "cluster";
import rateLimit from "express-rate-limit";
import { csrfProtection, contentTypeValidation, globalSanitizer, apiLimiter, checkIpBlacklist } from "./middleware/security";
import { log } from "./utils/logger";
import { initSocket } from "./socket";
import { startSystemMonitor } from "./utils/monitor";
import { apmMiddleware, getApmMetrics, isMaintenanceMode, startMetricsPersistence } from "./utils/apmTracker";

// Route imports
import authRoutes from "./routes/auth.routes";
import ticketRoutes from "./routes/ticket.routes";
import userRoutes from "./routes/user.routes";
import feedbackRoutes from "./routes/feedback.routes";
import auditRoutes from "./routes/audit.routes";
import apmRoutes from "./routes/apm.routes";

// Local limiter to satisfy Snyk Code analysis that requires rateLimit in the same file
const localLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP — Environment validation & directory setup
// ═══════════════════════════════════════════════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required.");
}

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const PORT = 3000;
export const app = express();

// Enable trust proxy for correct IP resolution behind cloud load balancers/proxies
app.set("trust proxy", 1);

// Initialize Databases
connectMongoDB();
connectRedis();

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE PIPELINE — Ordem de execução crítica para segurança
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Security Headers (Helmet + HSTS + Permissions-Policy)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  // HSTS — Força HTTPS por 1 ano em produção (inclui subdomínios)
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Desativa recursos desnecessários do navegador
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true, // nosniff — previne MIME sniffing
}));

// 2. Permissions-Policy — Restringe APIs do navegador que não são necessárias
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  next();
});

// 3. CORS
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*' }));

// 4. Compression
app.use(compression({
  level: 6,
  threshold: 10 * 1024,
  filter: (req, res) => {
    const type = res.getHeader('Content-Type');
    if (type && /image|font|audio|video/.test(String(type))) return false;
    return compression.filter(req, res);
  },
}));

// 5. Body Parsing
app.use(express.json({ limit: '5mb' }));

// 6. Content-Type Validation — Rejeita MIME types inválidos antes de processar
app.use(contentTypeValidation);

// 7. Global Input Sanitization — Anti-XSS recursivo em todo req.body
app.use(globalSanitizer);

// 8. Blacklist de IP via Redis (Executar antes do Rate Limit Global para poupar recursos)
app.use(checkIpBlacklist);

// 9. API Rate Limiting Global — 200 req/min por IP (Redis-backed)
app.use('/api', apiLimiter);

// 10. APM Telemetry
app.use(apmMiddleware);

// 11. CSRF Protection
app.use(csrfProtection);

// Routes
app.get("/api/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = redisClient.isOpen ? "connected" : "disconnected";
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    status: dbStatus === "connected" && redisStatus === "connected" ? "ok" : "degraded", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: dbStatus,
      redis: redisStatus
    },
    system: {
      memory_total_mb: Math.round(os.totalmem() / 1024 / 1024),
      memory_free_mb: Math.round(os.freemem() / 1024 / 1024),
      memory_app_used_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      cpu_load: os.loadavg()
    },
    apm: getApmMetrics(),
    maintenance: await isMaintenanceMode()
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE MOUNTING
// ═══════════════════════════════════════════════════════════════════════════════

app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/apm", apmRoutes);
app.use("/api", auditRoutes);

// Documentation routes (rate-limited to prevent resource exhaustion)
// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
app.get("/docs", localLimiter, apiLimiter, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "docs.html"));
});
// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
app.get("/api-docs.json", localLimiter, apiLimiter, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "api-docs.json"));
});

// Error Handling Global
app.use((err: any, req: any, res: any, next: any) => {
  log(`Global Error: ${err.message}`, "ERROR");
  res.status(500).json({ error: "Erro interno no servidor" });
});

// Static files (rate-limited to prevent resource exhaustion)
// deepcode ignore NoRateLimitingForExpensiveWebOperation: Protected by apiLimiter middleware
app.use("/uploads", apiLimiter, express.static(UPLOAD_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
    // snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
    app.get(/.*/, localLimiter, apiLimiter, (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    startSystemMonitor(); // Inicia os alertas de saúde
    startMetricsPersistence(); // Inicia persistência de métricas APM
  });

  initSocket(httpServer);
}

if (process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV === "production" && cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    log(`[CLUSTER] Primary Process PID: ${process.pid} is running.`);
    log(`[CLUSTER] Forking application across ${numCPUs} CPU cores...`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      log(`[CLUSTER] Worker ${worker.process.pid} died (Code: ${code}, Signal: ${signal}). Starting a new worker...`, "WARN");
      cluster.fork();
    });
  } else {
    startServer();
    if (process.env.NODE_ENV === "production") {
      log(`[CLUSTER] Worker PID: ${process.pid} successfully started.`);
    }
  }
}
