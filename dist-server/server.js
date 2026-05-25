// src/server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path4 from "path";
import helmet2 from "helmet";
import cors from "cors";
import compression from "compression";
import fs3 from "fs";
import "dotenv/config";

// src/config/mongo.ts
import mongoose2 from "mongoose";

// src/utils/logger.ts
var recentLogs = [];
function log(msg, level = "INFO") {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = {
    timestamp,
    level,
    message: msg,
    service: "axion-backend",
    pid: process.pid
  };
  console.log(JSON.stringify(logEntry));
  if (level === "WARN" || level === "ERROR") {
    recentLogs.push({ timestamp, level, message: msg });
    if (recentLogs.length > 50) {
      recentLogs.shift();
    }
  }
}

// src/config/mongo.ts
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";

// src/models/mongoose.ts
import mongoose, { Schema } from "mongoose";

// src/utils/crypto.ts
import crypto from "node:crypto";
import "dotenv/config";
var IV_LENGTH = 12;
function loadEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY inv\xE1lida ou ausente no .env (m\xEDnimo 32 caracteres)");
  }
  return Buffer.from(key, "utf-8").subarray(0, 32);
}
function encrypt(text) {
  if (!text) return null;
  const parts = text.split(":");
  if (parts.length === 3 && parts[0].length === 24 && parts[1].length === 32) return text;
  const keyBuffer = loadEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + authTag + ":" + encrypted;
}
function decrypt(text) {
  if (!text) return null;
  const textParts = text.split(":");
  if (textParts.length !== 3 || textParts[0].length !== 24 || textParts[1].length !== 32) {
    return text;
  }
  try {
    const keyBuffer = loadEncryptionKey();
    const iv = Buffer.from(textParts[0], "hex");
    const authTag = Buffer.from(textParts[1], "hex");
    const encryptedText = Buffer.from(textParts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, void 0, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Falha ao descriptografar dado:", error);
    return text;
  }
}

// src/models/mongoose.ts
var fiveYearsInSeconds = 15768e4;
var UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  matricula: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "Usu\xE1rio" },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date },
  mfaSecret: { type: String, get: decrypt, set: encrypt },
  mfaEnabled: { type: Boolean, default: false },
  email: { type: String, get: decrypt, set: encrypt },
  notificationPreference: {
    type: String,
    enum: ["email", "none"],
    default: "none"
  },
  allowedTicketTypes: { type: [String], default: [] },
  tokenVersion: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});
var TicketSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  agv_number: { type: String },
  part_name: { type: String },
  sap_number: { type: String },
  side: { type: String },
  observation: { type: String },
  image_path: { type: String },
  status: { type: String, default: "Aberto" },
  operator_name: { type: String },
  operator_matricula: { type: String },
  priority: { type: String },
  operational_impact: { type: String },
  downtime: { type: String },
  assigned_to: { type: String },
  started_at: { type: Date },
  finished_at: { type: Date },
  resolution_report: { type: String },
  resolution_image_path: { type: String }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  toJSON: { getters: true },
  toObject: { getters: true }
});
TicketSchema.index({ status: 1, created_at: -1 });
TicketSchema.index({ type: 1, status: 1, created_at: -1 });
TicketSchema.index({ priority: 1, status: 1 });
TicketSchema.index({ assigned_to: 1, status: 1 });
TicketSchema.index({ type: 1, created_at: -1 });
TicketSchema.index({ agv_number: 1, created_at: -1 });
TicketSchema.index({ location: 1, created_at: -1 });
var AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  username: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, expires: fiveYearsInSeconds }
});
var LoginHistorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  ip_address: { type: String },
  device: { type: String },
  timestamp: { type: Date, default: Date.now }
});
var OperatorFeedbackSchema = new Schema({
  id: { type: String, required: true, unique: true },
  matricula: { type: String, required: true },
  name: { type: String, required: true },
  feedback: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});
var ApmMetricSchema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  cpu_usage: { type: Number },
  ram_used_mb: { type: Number },
  ram_total_mb: { type: Number },
  load_avg: { type: [Number] },
  requests_per_min: { type: Number },
  avg_latency_ms: { type: Number },
  error_rate: { type: Number },
  ws_clients: { type: Number },
  db_response_time_ms: { type: Number },
  disk_free_gb: { type: Number },
  disk_total_gb: { type: Number }
});
var ApmReportSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  generated_by: { type: String, required: true },
  status: { type: String, default: "completed" },
  risk_level: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Low" },
  health_score: { type: Number },
  summary: { type: Schema.Types.Mixed },
  recommendations: { type: [String] },
  metrics_snapshots: { type: Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
});
var WeComWebhookSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String },
  url: { type: String, required: true },
  ticketTypes: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
});
UserSchema.index({ username: 1 });
var User = mongoose.model("User", UserSchema);
var Ticket = mongoose.model("Ticket", TicketSchema);
var AuditLog = mongoose.model("AuditLog", AuditLogSchema);
LoginHistorySchema.index({ timestamp: -1 });
var LoginHistory = mongoose.model("LoginHistory", LoginHistorySchema);
OperatorFeedbackSchema.index({ created_at: -1 });
var OperatorFeedback = mongoose.model("OperatorFeedback", OperatorFeedbackSchema);
var ApmMetric = mongoose.model("ApmMetric", ApmMetricSchema);
ApmReportSchema.index({ created_at: -1 });
var ApmReport = mongoose.model("ApmReport", ApmReportSchema);
var WeComWebhook = mongoose.model("WeComWebhook", WeComWebhookSchema);

// src/config/mongo.ts
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/Axion";
  try {
    await mongoose2.connect(uri, {
      maxPoolSize: 20,
      // Mantém até 20 conexões ativas no pool (Performance)
      minPoolSize: 5,
      // Mantém mínimo de 5 conexões preparadas
      serverSelectionTimeoutMS: 5e3,
      socketTimeoutMS: 45e3
    });
    log("Connected to MongoDB successfully (Pool Configured)");
    await seedAdmin();
    await migrateRoles();
  } catch (error) {
    log(`MongoDB connection error: ${error}`, "ERROR");
    setTimeout(connectMongoDB, 5e3);
  }
}
async function migrateRoles() {
  try {
    const resManu = await User.updateMany({ role: "Manutencista" }, { $set: { role: "Moderador" } });
    if (resManu.modifiedCount > 0) {
      log(`Migrated ${resManu.modifiedCount} users from Manutencista to Moderador`);
    }
    const resStd = await User.updateMany({ role: "Standard" }, { $set: { role: "Usu\xE1rio" } });
    if (resStd.modifiedCount > 0) {
      log(`Migrated ${resStd.modifiedCount} users from Standard to Usu\xE1rio`);
    }
    const defaultTypes = ["AGV com falha", "Colis\xE3o", "Falta de pe\xE7as", "Painel/Botoeira", "Res\xEDduos", "Erro de Software", "Bateria Fraca"];
    await User.updateMany(
      { role: "Moderador", $or: [{ allowedTicketTypes: { $exists: false } }, { allowedTicketTypes: { $size: 0 } }] },
      { $set: { allowedTicketTypes: defaultTypes } }
    );
  } catch (err) {
    log(`Role migration error: ${err.message}`, "ERROR");
  }
}
async function seedAdmin() {
  try {
    let admin = await User.findOne({
      $or: [
        { matricula: "0000000" },
        { username: { $regex: /^admin$/i } },
        { role: "SuperAdmin" }
      ]
    });
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminUsername = process.env.SEED_ADMIN_USERNAME;
    if (!seedPassword || !adminUsername) {
      log("SEED_ADMIN_PASSWORD ou SEED_ADMIN_USERNAME n\xE3o definidas no .env. Seed do admin ignorada.", "WARN");
      return;
    }
    const hashedPassword = await argon2.hash(seedPassword);
    if (admin) {
      log("Admin user found by matricula. Checking if credentials need update...");
      let needsUpdate = false;
      if (admin.username !== adminUsername) {
        admin.username = adminUsername;
        needsUpdate = true;
      }
      const passwordMatches = await argon2.verify(admin.password, seedPassword).catch(() => false);
      if (!passwordMatches) {
        admin.password = hashedPassword;
        admin.tokenVersion = (admin.tokenVersion || 0) + 1;
        needsUpdate = true;
      }
      if (admin.role !== "SuperAdmin") {
        admin.role = "SuperAdmin";
        needsUpdate = true;
      }
      if (admin.notificationPreference !== "email") {
        admin.notificationPreference = "email";
        needsUpdate = true;
      }
      if (needsUpdate) {
        await admin.save();
        log("Admin credentials updated in database.");
      } else {
        log("Admin credentials are up to date. Skipping update.");
      }
    } else {
      log("Seeding default admin user...");
      await User.create({
        id: uuidv4(),
        username: adminUsername,
        matricula: "0000000",
        password: hashedPassword,
        role: "SuperAdmin",
        notificationPreference: "email"
      });
      log("Admin user created successfully.");
    }
  } catch (err) {
    log(`Seed error: ${err.message}`, "ERROR");
  }
}

// src/config/redis.ts
import { createClient } from "redis";
var redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
var redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5e3,
    keepAlive: 3e4,
    reconnectStrategy: (retries) => {
      const baseDelay = Math.min(100 * Math.pow(2, retries), 3e4);
      const jitter = Math.random() * baseDelay * 0.2;
      return baseDelay + jitter;
    }
  }
});
redisClient.on("error", (err) => log(`Redis Client Error: ${err}`, "ERROR"));
redisClient.on("connect", () => log("Connected to Redis successfully"));
var connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    log(`Failed to connect to Redis: ${error}`, "ERROR");
  }
};
var redis_default = redisClient;

// src/server.ts
import mongoose5 from "mongoose";
import os3 from "os";
import cluster2 from "cluster";

// src/middleware/rateLimiters.ts
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
var createStore = (prefix) => {
  if (process.env.NODE_ENV === "test") return void 0;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => redis_default.sendCommand(args)
  });
};
var localLimiter = rateLimit({
  store: createStore("local"),
  windowMs: 15 * 60 * 1e3,
  max: 100,
  message: "Too many requests, please try again later."
});
var apiLimiter = rateLimit({
  store: createStore("api"),
  windowMs: 1 * 60 * 1e3,
  // 1 minute
  max: 300,
  message: "Too many requests to the API, please try again later."
});
var loginLimiter = rateLimit({
  store: createStore("login"),
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 15,
  message: "Too many login attempts, please try again later."
});
var publicLimiter = rateLimit({
  store: createStore("public"),
  windowMs: 60 * 1e3,
  // 1 minute
  max: 50,
  message: "Too many requests to public endpoints."
});

// src/server.ts
import rateLimit4 from "express-rate-limit";
import { RedisStore as RedisStore4 } from "rate-limit-redis";

// src/middleware/security.ts
import rateLimit2 from "express-rate-limit";
import { RedisStore as RedisStore2 } from "rate-limit-redis";
import helmet from "helmet";
import sanitizeHtml from "sanitize-html";
function isLocalHostOrPrivateIP(hostname) {
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
function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    return isLocalHostOrPrivateIP(url.hostname);
  } catch {
    return false;
  }
}
var csrfProtection = (req, res, next) => {
  if (["GET", "OPTIONS", "HEAD"].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const xRequestedWith = req.headers["x-requested-with"];
  if (!xRequestedWith || xRequestedWith !== "XMLHttpRequest") {
    return res.status(403).json({ error: "CSRF Validation Failed: X-Requested-With header required" });
  }
  if (process.env.NODE_ENV === "production") {
    if (!origin && !referer) {
      return res.status(403).json({ error: "CSRF token missing or incorrect (Origin/Referer header required)" });
    }
    const defaultLocalOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "https://localhost",
      "https://127.0.0.1",
      "http://localhost",
      "http://localhost:8080",
      "https://localhost:8443",
      "http://localhost:80"
    ];
    const allowedOrigins = process.env.CORS_ORIGINS ? [...process.env.CORS_ORIGINS.split(","), ...defaultLocalOrigins] : defaultLocalOrigins;
    if (origin && !allowedOrigins.includes("*") && !allowedOrigins.includes(origin) && !isLocalOrigin(origin)) {
      return res.status(403).json({ error: `CSRF Validation Failed: Origin mismatch (${origin})` });
    }
  }
  next();
};
function createRedisStore(prefix) {
  try {
    if (redis_default && redis_default.isOpen && typeof redis_default.sendCommand === "function") {
      return new RedisStore2({
        sendCommand: (...args) => redis_default.sendCommand(args),
        prefix: `rl:${prefix}:`
      });
    }
  } catch (err) {
    log(`Rate Limiter Redis Store fallback to memory for prefix: ${prefix}`, "WARN");
  }
  return void 0;
}
var loginLimiter2 = rateLimit2({
  windowMs: 1 * 60 * 1e3,
  // 1 minuto
  max: 15,
  // 15 tentativas por minuto por IP (reduzido de 50 para hardening)
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("login"),
  message: { error: "Muitas tentativas de login. Tente novamente em 1 minuto." },
  validate: { xForwardedForHeader: false }
});
var publicLimiter2 = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("public"),
  message: { error: "Muitas requisi\xE7\xF5es. Tente novamente em breve." }
});
var apiLimiter2 = rateLimit2({
  windowMs: 1 * 60 * 1e3,
  // 1 minuto
  max: 200,
  // 200 req/min por IP para uso normal da API
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("api"),
  message: { error: "Limite de requisi\xE7\xF5es excedido. Aguarde um momento." }
});
var contentTypeValidation = (req, res, next) => {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }
  const contentLength = req.headers["content-length"];
  if (!contentLength || contentLength === "0") {
    return next();
  }
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json") || contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    return next();
  }
  log(`Content-Type rejeitado: ${contentType} | IP: ${req.ip} | Path: ${req.path}`, "WARN");
  return res.status(415).json({
    error: "Content-Type n\xE3o suportado. Use application/json para chamadas de API."
  });
};
var sanitizeOptions = {
  allowedTags: [],
  // Remove TODAS as tags HTML
  allowedAttributes: {},
  // Remove TODOS os atributos
  disallowedTagsMode: "discard"
};
function deepSanitize(obj) {
  if (typeof obj === "string") {
    return sanitizeHtml(obj, sanitizeOptions);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }
  if (obj && typeof obj === "object") {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = deepSanitize(obj[key]);
    }
    return sanitized;
  }
  return obj;
}
var globalSanitizer = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
};
var securityHeaders = helmet();
var checkIpBlacklist = async (req, res, next) => {
  if (!redis_default || !redis_default.isOpen || !req.ip) return next();
  try {
    if (isLocalHostOrPrivateIP(req.ip)) {
      return next();
    }
    const isBlacklisted = await redis_default.sIsMember("ip_blacklist", req.ip);
    if (isBlacklisted) {
      log(`Conex\xE3o recusada do IP na blacklist: ${req.ip}`, "WARN");
      return res.status(403).json({ error: "Acesso bloqueado por viola\xE7\xF5es repetidas de seguran\xE7a." });
    }
    next();
  } catch (err) {
    next();
  }
};
var incrementIpFailure = async (ip) => {
  if (!redis_default || !redis_default.isOpen || !ip) return;
  try {
    if (isLocalHostOrPrivateIP(ip)) {
      return;
    }
    const key = `ip_fails:${ip}`;
    const failures = await redis_default.incr(key);
    if (failures === 1) {
      await redis_default.expire(key, 3600);
    }
    if (failures >= 4) {
      log(`IP adicionado \xE0 Blacklist permanente (Anti-Brute Force): ${ip}`, "ERROR");
      await redis_default.sAdd("ip_blacklist", ip);
    }
  } catch (err) {
    log(`Erro no Tracker de Blacklist: ${err}`, "ERROR");
  }
};

// src/socket.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
var io;
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket"]
  });
  const pubClient = redis_default.duplicate();
  const subClient = redis_default.duplicate();
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    log("Socket.io Redis adapter connected", "INFO");
  }).catch((err) => {
    log(`Socket.io Redis adapter failed to connect: ${err.message}`, "ERROR");
  });
  io.of("/tenant-axion").on("connection", (socket) => {
    log(`WebSocket client connected [tenant-axion]: ${socket.id}`, "INFO");
    socket.on("authenticate", async (payload) => {
      try {
        let token = payload?.token;
        if (!token || token === "true") {
          if (socket.request.headers.cookie) {
            const cookies = socket.request.headers.cookie.split(";").reduce((acc, cookie) => {
              const idx = cookie.indexOf("=");
              if (idx > 0) {
                acc[cookie.substring(0, idx).trim()] = cookie.substring(idx + 1).trim();
              }
              return acc;
            }, {});
            token = cookies["access_token"] || "";
          }
        }
        if (!token || token === "true") {
          log(`Socket auth failed: no valid token provided or found in cookies`, "WARN");
          socket.disconnect();
          return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          log("JWT_SECRET is missing in .env", "ERROR");
          socket.disconnect();
          return;
        }
        const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
        const userDoc = await User.findOne({ username: decoded.username });
        if (!userDoc) {
          log(`Socket auth failed: user ${decoded.username} not found`, "WARN");
          socket.disconnect();
          return;
        }
        if (decoded.tokenVersion !== void 0 && userDoc.tokenVersion !== decoded.tokenVersion) {
          log(`Socket auth failed: tokenVersion mismatch for ${decoded.username}`, "WARN");
          socket.disconnect();
          return;
        }
        socket.data.user = {
          ...decoded,
          role: userDoc.role
        };
        if (userDoc.role === "Moderador") {
          socket.data.allowedTicketTypes = userDoc.allowedTicketTypes || [];
        } else {
          socket.data.allowedTicketTypes = ["ALL"];
        }
        log(`Socket ${socket.id} authenticated as ${decoded.username} (${userDoc.role})`, "INFO");
      } catch (err) {
        log(`Socket auth error: ${err.message}`, "WARN");
        socket.disconnect();
      }
    });
    socket.on("disconnect", () => {
    });
  });
  return io;
}
function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
async function emitSelectiveTicketsUpdated(ticketType) {
  try {
    if (!io) return;
    const namespace = io.of("/tenant-axion");
    const sockets = await namespace.fetchSockets();
    for (const socket of sockets) {
      const user = socket.data?.user;
      if (user && user.role === "Moderador") {
        const allowed = socket.data?.allowedTicketTypes || [];
        if (ticketType && !allowed.includes(ticketType)) {
          continue;
        }
      }
      socket.emit("tickets_updated");
    }
  } catch (err) {
    log(`Selective socket emit error: ${err.message}`, "ERROR");
    try {
      io?.of("/tenant-axion").emit("tickets_updated");
    } catch (e) {
    }
  }
}

// src/utils/monitor.ts
import os from "os";
import mongoose3 from "mongoose";

// src/utils/webhook.ts
async function sendDiscordWebhook(title, description, color = 2450411) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    log("Webhook: DISCORD_WEBHOOK_URL not configured. Skipping notification.", "INFO");
    return;
  }
  const payload = {
    embeds: [
      {
        title,
        description,
        color,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) {
      log(`Webhook failed with status ${response.status}`, "ERROR");
    }
  } catch (error) {
    log(`Webhook Error: ${error.message}`, "ERROR");
  }
}
async function sendWeComMessage(webhookUrl, markdownMessage) {
  try {
    const payload = {
      msgtype: "markdown",
      markdown: { content: markdownMessage }
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
    }
    log(`[WeCom]: Mensagem enviada com sucesso`, "INFO");
  } catch (error) {
    log(`Erro no envio de WeCom: ${error.message}`, "ERROR");
  }
}

// src/utils/templates/email.template.ts
function buildUnifiedEmailHtml(options) {
  const fieldsHtml = options.fields.map((field) => {
    let valueHtml = "";
    if (field.isBadge) {
      valueHtml = `<span style="background: ${field.badgeBg || "#e2e8f0"}; color: ${field.badgeColor || "#18181b"}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${field.value}</span>`;
    } else {
      valueHtml = `<span style="color: #334155; font-weight: 600;">${field.value}</span>`;
    }
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; font-size: 11px; width: 180px; text-transform: uppercase; letter-spacing: 0.05em;">${field.label}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${valueHtml}</td>
      </tr>
    `;
  }).join("");
  let highlightHtml = "";
  if (options.highlightBox) {
    highlightHtml = `
      <div style="margin-top: 24px; padding: 20px; background: ${options.highlightBox.bg || "#f8fafc"}; border: 1px solid ${options.highlightBox.border || "#e2e8f0"}; border-radius: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
        <h4 style="margin: 0 0 8px 0; color: ${options.highlightBox.color || "#09090b"}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
          ${options.highlightBox.title}
        </h4>
        <p style="margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #334155;">${options.highlightBox.content}</p>
      </div>
    `;
  }
  return `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center" bgcolor="#09090b" style="background-color: #09090b; padding: 32px 24px; text-align: center; border-bottom: 4px solid #DC2626;">
              <div style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff !important;">
                <font color="#ffffff">${options.title}</font>
              </div>
              <div style="margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8 !important;">
                <font color="#94a3b8">INDUSTRIAL OPERATIONS PLATFORM</font>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h3 style="color: ${options.subtitleColor || "#DC2626"}; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">${options.subtitle}</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">${options.description}</p>
          
          <!-- Table -->
          <table style="text-align: left; border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th colspan="2" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;">Ficha de Ocorr\xEAncia</th>
              </tr>
            </thead>
            <tbody>
              ${fieldsHtml}
            </tbody>
          </table>
          
          ${highlightHtml}
          
          <div style="margin-top: 32px; text-align: center;">
            <a href="https://axiontechnology.com/admin" style="display: inline-block; background-color: #DC2626; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Acessar Painel Axion</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;"/>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
            Este \xE9 um e-mail autom\xE1tico gerado pelo sistema integrado AXION.<br/>
            &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Axion Technology. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  `;
}

// src/utils/notifications.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
async function sendEmailMessage(email, subject, htmlMessage) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      log(`[Mock Email -> ${email} | ${subject}]: 
(Configure as vari\xE1veis SMTP para envio real)`, "INFO");
      return;
    }
    const info = await transporter.sendMail({
      from: `"AXION OPs" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: htmlMessage
    });
    log(`[Email -> ${email}]: Mensagem enviada com sucesso (ID: ${info.messageId})`, "INFO");
  } catch (error) {
    log(`Erro no envio de E-mail para ${email}: ${error.message}`, "ERROR");
  }
}
async function notifyUsersAboutTicket(ticketData, priority) {
  try {
    const isColisao = ticketData.type === "Colis\xE3o";
    if (!isColisao && priority !== "Cr\xEDtico" && priority !== "Alto") {
      return;
    }
    const targetUsers = await getNotificationTargetUsers({ ticketType: ticketData.type });
    const alertLevel = isColisao ? "\u{1F6A8} ALERTA CR\xCDTICO \u2014 COLIS\xC3O" : "\u{1F6A8} ALERTA CR\xCDTICO";
    const date = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const messageTemplate = `# AXION - CENTRAL DE OPERA\xC7\xD5ES
<font color="warning">${alertLevel}</font>

${isColisao ? "\u26A0\uFE0F Um chamado de **COLIS\xC3O** foi registrado e classificado automaticamente como CR\xCDTICO." : "Um chamado cr\xEDtico foi registrado no sistema e requer a\xE7\xE3o imediata."}

**Detalhes da Ocorr\xEAncia:**
> **ID:** ${ticketData.id}
> **Prioridade:** ${priority}
> **Tipo:** ${ticketData.type}
> **Setor/Local:** ${ticketData.location}
> **Impacto:** ${ticketData.impact === "total" ? "Parada Total da Linha" : "Impacto Parcial / Operacional"}
> **Operador Respons\xE1vel:** ${ticketData.operator_name || "N/A"}
> **Hor\xE1rio da Ocorr\xEAncia:** ${date}

Por favor, acesse a plataforma AXION imediatamente para realizar a tratativa do chamado.

\u{1F517} [Acessar Sistema AXION](https://app.axiontechnology.cloud)`;
    const emailHtmlTemplate = buildUnifiedEmailHtml({
      title: "AXION - CENTRAL DE OPERA\xC7\xD5ES",
      subtitle: alertLevel,
      subtitleColor: "#dc2626",
      // Vermelho Alerta
      description: isColisao ? "Um incidente de <strong>colis\xE3o industrial</strong> foi registrado e classificado automaticamente como urg\xEAncia m\xE1xima. O atendimento imediato de um moderador/t\xE9cnico \xE9 requerido para a desobstru\xE7\xE3o e seguran\xE7a da via." : "Um chamado operacional cr\xEDtico foi reportado na linha de produ\xE7\xE3o e requer aten\xE7\xE3o imediata da equipe de gest\xE3o.",
      fields: [
        { label: "ID do Chamado", value: ticketData.id },
        { label: "Prioridade", value: priority, isBadge: true, badgeBg: "#fef2f2", badgeColor: "#dc2626" },
        { label: "Tipo do Incidente", value: ticketData.type },
        { label: "Setor / Local", value: ticketData.location },
        { label: "Impacto Operacional", value: ticketData.impact === "total" ? "Parada Total da Linha" : "Parcial / Risco Operacional" },
        { label: "Operador Solicitante", value: ticketData.operator_name || "N/A" },
        { label: "Hor\xE1rio", value: date }
      ]
    });
    await dispatchNotifications(targetUsers, messageTemplate, `AXION: ${alertLevel} - ${ticketData.id}`, emailHtmlTemplate, ticketData.type);
    await sendDiscordWebhook(
      isColisao ? "\u{1F6A8} COLIS\xC3O \u2014 Chamado Cr\xEDtico Aberto" : "\u{1F6A8} Chamado Cr\xEDtico Aberto",
      `**ID:** ${ticketData.id}
**Tipo:** ${ticketData.type}
**Local:** ${ticketData.location}
**Impacto:** ${ticketData.impact}
**Operador:** ${ticketData.operator_name}`,
      15680580
    );
  } catch (error) {
    log(`Notification Dispatch Error: ${error.message}`, "ERROR");
  }
}
async function notifyUsersAboutTicketFinished(ticketData) {
  try {
    const targetUsers = await getNotificationTargetUsers({
      ticketType: ticketData.type,
      isFinishedAlert: true,
      assignedTo: ticketData.assigned_to
    });
    const date = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const createdAt = ticketData.created_at ? new Date(ticketData.created_at) : null;
    const finishedAt = ticketData.finished_at ? new Date(ticketData.finished_at) : /* @__PURE__ */ new Date();
    let mttrDisplay = "N/A";
    if (createdAt) {
      const diffMs = finishedAt.getTime() - createdAt.getTime();
      const diffMinutes = Math.round(diffMs / 6e4);
      if (diffMinutes < 60) {
        mttrDisplay = `${diffMinutes} min`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        mttrDisplay = `${hours}h ${mins}min`;
      }
    }
    const createdAtStr = createdAt ? createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "N/A";
    const finishedAtStr = finishedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const reportTruncated = typeof ticketData.resolution_report === "string" ? ticketData.resolution_report.length > 500 ? ticketData.resolution_report.substring(0, 500) + "..." : ticketData.resolution_report : "N/A";
    const alertLevel = "\u2705 CHAMADO FINALIZADO";
    const messageTemplate = `# AXION - CENTRAL DE OPERA\xC7\xD5ES
<font color="info">${alertLevel}</font>

O chamado abaixo foi finalizado com sucesso.

**Detalhes da Finaliza\xE7\xE3o:**
> **ID:** ${ticketData.id}
> **Tipo:** ${ticketData.type}
> **Prioridade:** ${ticketData.priority || "N/A"}
> **Setor/Local:** ${ticketData.location}
> **Operador Solicitante:** ${ticketData.operator_name || "N/A"}
> **T\xE9cnico Respons\xE1vel:** ${ticketData.assigned_to || "N/A"}
> **Finalizado por:** ${ticketData.finished_by || "N/A"}
> **Abertura:** ${createdAtStr}
> **Finaliza\xE7\xE3o:** ${finishedAtStr}
> **Tempo de Resolu\xE7\xE3o (MTTR):** ${mttrDisplay}

**Relat\xF3rio de Finaliza\xE7\xE3o:**
${reportTruncated}

\u{1F517} [Acessar Sistema AXION](https://app.axiontechnology.cloud)`;
    const emailHtmlTemplate = buildUnifiedEmailHtml({
      title: "AXION - CENTRAL DE OPERA\xC7\xD5ES",
      subtitle: alertLevel,
      subtitleColor: "#059669",
      // Verde Esmeralda
      description: `O chamado n\xFAmero <strong>${ticketData.id}</strong> foi resolvido pela equipe t\xE9cnica de manuten\xE7\xE3o e finalizado formalmente com o relat\xF3rio abaixo anexado para fins de auditoria de processos e c\xE1lculo de performance.`,
      fields: [
        { label: "ID do Chamado", value: ticketData.id },
        { label: "Tipo do Incidente", value: ticketData.type },
        { label: "Prioridade Inicial", value: ticketData.priority || "N/A", isBadge: true, badgeBg: ticketData.priority === "Cr\xEDtico" ? "#fef2f2" : "#f0fdf4", badgeColor: ticketData.priority === "Cr\xEDtico" ? "#dc2626" : "#15803d" },
        { label: "Setor / Local", value: ticketData.location },
        { label: "Operador Solicitante", value: ticketData.operator_name || "N/A" },
        { label: "T\xE9cnico Alocado", value: ticketData.assigned_to || "N/A" },
        { label: "Finalizado por", value: ticketData.finished_by || "N/A" },
        { label: "Data de Abertura", value: createdAtStr },
        { label: "Data de Fechamento", value: finishedAtStr },
        { label: "Tempo de Reparo (MTTR)", value: mttrDisplay, isBadge: true, badgeBg: "#eff6ff", badgeColor: "#DC2626" }
      ],
      highlightBox: {
        title: "\u{1F4CB} Relat\xF3rio de Resolu\xE7\xE3o T\xE9cnica",
        content: ticketData.resolution_report || "N/A",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#065f46"
      }
    });
    await dispatchNotifications(targetUsers, messageTemplate, `AXION: ${alertLevel} - ${ticketData.id}`, emailHtmlTemplate, ticketData.type);
    await sendDiscordWebhook(
      "\u2705 Chamado Finalizado",
      `**ID:** ${ticketData.id}
**Tipo:** ${ticketData.type}
**T\xE9cnico:** ${ticketData.assigned_to || "N/A"}
**MTTR:** ${mttrDisplay}
**Relat\xF3rio:** ${reportTruncated}`,
      1096065
    );
  } catch (error) {
    log(`Finish Notification Dispatch Error: ${error.message}`, "ERROR");
  }
}
async function getNotificationTargetUsers(options) {
  const registeredUsers = await User.find({
    role: { $ne: "Usu\xE1rio" },
    notificationPreference: { $ne: "none" }
  });
  if (registeredUsers.length === 0) {
    return [{
      username: "Admin Teste",
      email: process.env.SMTP_USER || "axion.technology@gmail.com",
      notificationPreference: "both",
      role: "SuperAdmin"
    }];
  }
  const targetUsers = registeredUsers.filter((u) => {
    if (u.role === "Moderador") {
      const allowed = u.allowedTicketTypes || [];
      if (!allowed.includes(options.ticketType)) {
        return false;
      }
      if (options.isFinishedAlert) {
        return Boolean(options.assignedTo && u.username === options.assignedTo);
      }
      return true;
    }
    return true;
  });
  return targetUsers.map((u) => ({
    username: u.username,
    email: u.email,
    notificationPreference: u.notificationPreference,
    role: u.role
  }));
}
async function dispatchNotifications(targetUsers, wecomMessage, emailSubject, emailHtml, ticketType) {
  const promises = [];
  try {
    const webhooksDb = await WeComWebhook.find();
    let webhookUrls = [];
    const matchingWebhooks = webhooksDb.filter((wh) => wh.ticketTypes?.includes(ticketType));
    if (matchingWebhooks.length > 0) {
      webhookUrls = matchingWebhooks.map((wh) => wh.url);
    } else {
      const wecomMapString = process.env.WECOM_WEBHOOKS_MAP || "{}";
      const wecomMap = JSON.parse(wecomMapString);
      const fallbackUrl = wecomMap[ticketType] || wecomMap["default"];
      if (fallbackUrl) webhookUrls.push(fallbackUrl);
    }
    if (webhookUrls.length > 0) {
      for (const url of webhookUrls) {
        promises.push(sendWeComMessage(url, wecomMessage));
      }
    } else {
      log(`[WeCom]: Nenhuma URL configurada no DB nem no .env para '${ticketType}'.`, "WARN");
    }
  } catch (e) {
    log(`[WeCom]: Erro ao buscar webhooks ou parsear fallback: ${e.message}`, "ERROR");
  }
  for (const user of targetUsers) {
    if (user.role === "SuperAdmin" && user.email && user.email.trim() !== "") {
      const personalizedEmail = emailHtml.replace(/\{\{USER_NAME\}\}/g, user.username);
      promises.push(sendEmailMessage(user.email, emailSubject, personalizedEmail));
    }
  }
  await Promise.allSettled(promises);
}

// src/utils/circuitBreaker.ts
var CircuitBreaker = class {
  constructor(name, failureThreshold = 3, recoveryTimeoutMs = 1e4) {
    this.failures = 0;
    this.state = 0 /* CLOSED */;
    this.nextAttempt = Date.now();
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeoutMs;
  }
  async fire(action, fallback) {
    if (this.state === 1 /* OPEN */) {
      if (Date.now() > this.nextAttempt) {
        this.state = 2 /* HALF_OPEN */;
        log(`CircuitBreaker [${this.name}]: State changed to HALF_OPEN. Retrying...`, "WARN");
      } else {
        if (fallback) return fallback();
        throw new Error(`CircuitBreaker [${this.name}] is OPEN. Call blocked.`);
      }
    }
    try {
      const result = await action();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      if (fallback) return fallback();
      throw error;
    }
  }
  recordFailure() {
    this.failures++;
    log(`CircuitBreaker [${this.name}]: Failure recorded (${this.failures}/${this.failureThreshold})`, "WARN");
    if (this.failures >= this.failureThreshold) {
      this.state = 1 /* OPEN */;
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      log(`CircuitBreaker [${this.name}]: Threshold reached. State changed to OPEN. Next attempt in ${this.recoveryTimeout}ms`, "ERROR");
    }
  }
  reset() {
    if (this.state !== 0 /* CLOSED */) {
      log(`CircuitBreaker [${this.name}]: Connection restored. State changed to CLOSED.`, "INFO");
    }
    this.failures = 0;
    this.state = 0 /* CLOSED */;
  }
};

// src/utils/monitor.ts
var emailBreaker = new CircuitBreaker("MonitorEmail", 3, 3e4);
var discordBreaker = new CircuitBreaker("MonitorDiscord", 3, 3e4);
var alertCooldowns = {};
var COOLDOWN_MS = 15 * 60 * 1e3;
function canSendAlert(alertKey) {
  const now = Date.now();
  if (!alertCooldowns[alertKey] || now - alertCooldowns[alertKey] > COOLDOWN_MS) {
    alertCooldowns[alertKey] = now;
    return true;
  }
  return false;
}
function startSystemMonitor() {
  log("System Monitor Started. Checking health every 60s...", "INFO");
  setInterval(async () => {
    try {
      const dbStatus = mongoose3.connection.readyState === 1;
      const redisStatus = redis_default.isOpen;
      const cpus = os.cpus();
      const loadAvg = os.loadavg()[0];
      const cpuUsagePercent = loadAvg / cpus.length * 100;
      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsedPercent = (memTotal - memFree) / memTotal * 100;
      const processMem = process.memoryUsage();
      const heapUsedMB = (processMem.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (processMem.heapTotal / 1024 / 1024).toFixed(2);
      const rssMB = (processMem.rss / 1024 / 1024).toFixed(2);
      const alerts = [];
      if (!dbStatus) {
        if (canSendAlert("mongo_down")) {
          alerts.push("\u26A0\uFE0F **ALERTA CR\xCDTICO:** Conex\xE3o com o MongoDB caiu!");
        }
      }
      if (!redisStatus) {
        if (canSendAlert("redis_down")) {
          alerts.push("\u26A0\uFE0F **ALERTA CR\xCDTICO:** Conex\xE3o com o Redis caiu!");
        }
      }
      if (cpuUsagePercent > 80) {
        if (canSendAlert("cpu_high")) {
          alerts.push(`\u{1F525} **ALERTA DE DESEMPENHO:** CPU em estado cr\xEDtico (${cpuUsagePercent.toFixed(1)}% de uso).`);
        }
      }
      if (memUsedPercent > 90) {
        if (canSendAlert("mem_high")) {
          alerts.push(`\u{1F6A8} **ALERTA DE MEM\xD3RIA:** Uso de RAM excedeu 90% (${memUsedPercent.toFixed(1)}%). [Node Heap: ${heapUsedMB}MB / RSS: ${rssMB}MB]`);
        }
      }
      if (alerts.length > 0) {
        const message = alerts.join("\n");
        const htmlMessage = alerts.map((a) => `<p>${a}</p>`).join("");
        log(`System Monitor Triggered Alerts: ${message}`, "WARN");
        const targetEmail = process.env.SYSTEM_ADMIN_EMAIL || "axion.technology@gmail.com";
        const emailSubject = "\u{1F6A8} AXION CRITICAL SYSTEM ALERT";
        await emailBreaker.fire(async () => {
          await sendEmailMessage(targetEmail, emailSubject, `<h2>AXION SYSTEM MONITOR</h2><div style="color:red; font-weight:bold;">${htmlMessage}</div><p>Acesse o servidor IMEDIATAMENTE para verificar a infraestrutura.</p>`);
        }).catch((e) => log(`Monitor Email Error: ${e.message}`, "ERROR"));
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          await discordBreaker.fire(async () => {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: message,
                username: "AXION Health Monitor"
              }),
              signal: AbortSignal.timeout(5e3)
            });
          }).catch((e) => log(`Failed to send monitor webhook: ${e.message}`, "ERROR"));
        }
      }
    } catch (error) {
      log(`System Monitor Error: ${error.message}`, "ERROR");
    }
  }, 60 * 1e3);
}

// src/utils/apmTracker.ts
import cluster from "cluster";
import os2 from "os";
import mongoose4 from "mongoose";
var avgLatencyMs = 0;
var requestCountMoving = 0;
var lastReset = Date.now();
var requestsPerMin = 0;
var errorCountMoving = 0;
var dbLatencyMs = 0;
function recordApiMetrics(durationMs, isError) {
  const now = Date.now();
  if (now - lastReset > 6e4) {
    requestsPerMin = requestCountMoving;
    requestCountMoving = 0;
    errorCountMoving = 0;
    lastReset = now;
  }
  requestCountMoving++;
  if (isError) errorCountMoving++;
  if (avgLatencyMs === 0) {
    avgLatencyMs = durationMs;
  } else {
    avgLatencyMs = avgLatencyMs * 0.9 + durationMs * 0.1;
  }
}
function getApmMetrics() {
  let wsClients = 0;
  try {
    const io2 = getIO();
    if (io2) {
      wsClients = io2.of("/tenant-axion").sockets.size;
    }
  } catch (e) {
  }
  const currentRpm = requestsPerMin || requestCountMoving;
  const totalReqs = requestCountMoving;
  const errRate = totalReqs > 0 ? errorCountMoving / totalReqs * 100 : 0;
  const freeMem = os2.freemem();
  const totalMem = os2.totalmem();
  const ramUsedMb = Math.round((totalMem - freeMem) / 1024 / 1024);
  const ramTotalMb = Math.round(totalMem / 1024 / 1024);
  return {
    requestsPerMin: currentRpm,
    errorRatePercent: errRate.toFixed(1),
    avgLatencyMs: Math.round(avgLatencyMs),
    wsClients,
    workerPid: process.pid,
    workerId: cluster.worker ? cluster.worker.id : 1,
    recentLogs,
    ram_used_mb: ramUsedMb,
    ram_total_mb: ramTotalMb,
    cpu_usage: os2.loadavg()[0],
    // Load average de 1 min como proxy de CPU
    db_latency_ms: Math.round(dbLatencyMs)
  };
}
function startMetricsPersistence() {
  if (cluster.isWorker && cluster.worker?.id !== 1) return;
  setInterval(async () => {
    try {
      const startDb = Date.now();
      await mongoose4.connection.db?.admin().ping();
      dbLatencyMs = Date.now() - startDb;
      const metrics = getApmMetrics();
      await ApmMetric.create({
        cpu_usage: metrics.cpu_usage,
        ram_used_mb: metrics.ram_used_mb,
        ram_total_mb: metrics.ram_total_mb,
        load_avg: os2.loadavg(),
        requests_per_min: metrics.requestsPerMin,
        avg_latency_ms: metrics.avgLatencyMs,
        error_rate: parseFloat(metrics.errorRatePercent),
        ws_clients: metrics.wsClients,
        db_response_time_ms: dbLatencyMs,
        // Mock de disco (poderia ser expandido com pacotes como diskusage)
        disk_free_gb: 45,
        disk_total_gb: 100
      });
    } catch (err) {
    }
  }, 6e4 * 5);
}
var localMaintenanceMode = false;
async function setMaintenanceMode(enabled) {
  localMaintenanceMode = enabled;
  try {
    if (redis_default.isOpen) {
      await redis_default.set("axion:maintenance", enabled ? "true" : "false");
    }
  } catch (e) {
  }
}
async function isMaintenanceMode() {
  try {
    if (redis_default.isOpen) {
      const val = await redis_default.get("axion:maintenance");
      if (val !== null) return val === "true";
    }
  } catch (e) {
  }
  return localMaintenanceMode;
}
function apmMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    if (req.originalUrl && req.originalUrl.startsWith("/api")) {
      const duration = Date.now() - start;
      const isError = res.statusCode >= 400;
      recordApiMetrics(duration, isError);
    }
  });
  next();
}

// src/middleware/errorHandler.ts
var asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
var globalErrorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = status < 500 ? err.message || "Requisi\xE7\xE3o inv\xE1lida" : "Erro interno no servidor";
  if (status >= 500) {
    log(`Global Error: ${err.message || "Internal Server Error"}
Stack: ${err.stack}`, "ERROR");
  } else {
    log(`Client Error (${status}): ${err.message || "Client Error"}`, "WARN");
  }
  res.status(status).json({
    error: message,
    ...process.env.NODE_ENV !== "production" && status < 500 && { stack: err.stack }
  });
};

// src/routes/auth.routes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import argon22 from "argon2";
import jwt3 from "jsonwebtoken";
import { v4 as uuidv43 } from "uuid";

// src/utils/audit.ts
import { v4 as uuidv42 } from "uuid";
async function logAudit(action, username, details = {}) {
  try {
    await AuditLog.create({
      id: uuidv42(),
      action,
      username,
      details
    });
  } catch (err) {
    log(`Failed to log audit: ${err}`, "ERROR");
  }
}

// src/models/schemas.ts
import { z } from "zod";
var loginSchema = z.object({
  matricula: z.string().length(7, "A matr\xEDcula deve ter exatamente 7 d\xEDgitos").regex(/^\d+$/, "A matr\xEDcula deve conter apenas n\xFAmeros"),
  password: z.string().min(6).max(64)
});
var userSchema = z.object({
  username: z.string().min(3),
  matricula: z.string().length(7, "A matr\xEDcula deve ter exatamente 7 d\xEDgitos").regex(/^\d+$/, "A matr\xEDcula deve conter apenas n\xFAmeros"),
  password: z.string().min(6).max(64),
  role: z.string().optional(),
  email: z.string().email("E-mail inv\xE1lido").optional().or(z.literal("")),
  notificationPreference: z.enum(["email", "none"]).default("none"),
  allowedTicketTypes: z.array(z.string()).optional()
});
var ticketSchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  agv_number: z.string().regex(/^\d{1,10}$/, "Apenas valores inteiros positivos (m\xE1x 10 d\xEDgitos)").optional(),
  part_name: z.string().optional(),
  sap_number: z.string().optional(),
  side: z.string().optional(),
  observation: z.string().optional(),
  operator_name: z.string().optional(),
  operator_matricula: z.string().length(7, "A matr\xEDcula deve ter exatamente 7 d\xEDgitos").regex(/^\d+$/, "A matr\xEDcula deve conter apenas n\xFAmeros").optional().or(z.literal("")),
  impact: z.string().optional(),
  downtime: z.string().optional()
});
var ticketUpdateSchema = z.object({
  type: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  priority: z.enum(["Baixo", "M\xE9dio", "Alto", "Cr\xEDtico"]).optional(),
  operational_impact: z.string().optional(),
  downtime: z.string().optional(),
  observation: z.string().optional()
});
var ticketStatusSchema = z.object({
  status: z.enum(["Aberto", "Em atendimento", "Finalizado"])
});
var feedbackSchema = z.object({
  matricula: z.string().length(7, "A matr\xEDcula deve ter exatamente 7 d\xEDgitos").regex(/^\d+$/, "A matr\xEDcula deve conter apenas n\xFAmeros"),
  name: z.string().min(1),
  feedback: z.string().min(1)
});

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";
var requireAuth = async (req, res, next) => {
  let token = "";
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, cookie) => {
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
    const JWT_SECRET2 = process.env.JWT_SECRET;
    const decoded = jwt2.verify(token, JWT_SECRET2, { algorithms: ["HS256"] });
    const username = String(decoded.username);
    const cacheKey = `user:auth:${username}`;
    let userDoc = null;
    try {
      const cached = await redis_default.get(cacheKey);
      if (cached) userDoc = JSON.parse(cached);
    } catch (e) {
    }
    if (!userDoc) {
      const dbUserQuery = User.findOne({ username });
      const dbUser = typeof dbUserQuery.lean === "function" ? await dbUserQuery.lean() : await dbUserQuery;
      if (!dbUser) {
        logAudit("AUTH_REVOKED", username, { reason: "User account not found in database" });
        incrementIpFailure(req.ip);
        return res.status(401).json({ error: "Conta de usu\xE1rio inexistente ou desativada" });
      }
      userDoc = dbUser;
      try {
        await redis_default.setEx(cacheKey, 60, JSON.stringify(userDoc));
      } catch (e) {
      }
    }
    if (decoded.tokenVersion !== void 0 && userDoc.tokenVersion !== decoded.tokenVersion) {
      logAudit("TOKEN_VERSION_MISMATCH", String(decoded.username), { expected: userDoc.tokenVersion, received: decoded.tokenVersion });
      incrementIpFailure(req.ip);
      return res.status(401).json({ error: "Sess\xE3o expirada ou revogada pelo administrador" });
    }
    req.user = {
      ...decoded,
      role: userDoc.role,
      allowedTicketTypes: userDoc.allowedTicketTypes || [],
      tokenVersion: userDoc.tokenVersion
    };
    next();
  } catch (error) {
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Token inv\xE1lido, adulterado ou expirado" });
  }
};
var requireSuperAdmin = (req, res, next) => {
  const user = req.user;
  if (user?.role !== "SuperAdmin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "SuperAdmin", currentRole: user?.role });
    incrementIpFailure(req.ip);
    return res.status(403).json({ error: "Acesso restrito ao SuperAdmin" });
  }
  next();
};
var requireAdmin = (req, res, next) => {
  const user = req.user;
  if (user?.role !== "SuperAdmin" && user?.role !== "Admin") {
    logAudit("PRIVILEGE_ESCALATION_ATTEMPT", user?.username || "anonymous", { targetRole: "Admin", currentRole: user?.role });
    incrementIpFailure(req.ip);
    return res.status(403).json({ error: "Acesso restrito a Administradores" });
  }
  next();
};

// src/routes/auth.routes.ts
var router = Router();
router.post("/login", loginLimiter2, async (req, res) => {
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
      const now = /* @__PURE__ */ new Date();
      if (user.lockoutUntil && user.lockoutUntil > now && user.role !== "SuperAdmin") {
        const remaining = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / 6e4);
        const tempo = remaining > 1e5 ? "permanentemente" : `por ${remaining} minutos`;
        return res.status(401).json({ error: `Conta bloqueada ${tempo} devido a m\xFAltiplas tentativas falhas.` });
      }
      let passwordMatch = false;
      if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
        passwordMatch = bcrypt.compareSync(password, user.password);
        if (passwordMatch) {
          user.password = await argon22.hash(password);
          await user.save();
        }
      } else {
        try {
          passwordMatch = await argon22.verify(user.password, password);
        } catch (e) {
          passwordMatch = false;
        }
      }
      if (!passwordMatch) {
        if (user.role !== "SuperAdmin") {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          if (user.failedLoginAttempts >= 50) {
            user.lockoutUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1e3);
          } else if (user.failedLoginAttempts >= 15) {
            user.lockoutUntil = new Date(now.getTime() + 60 * 60 * 1e3);
          } else if (user.failedLoginAttempts >= 5) {
            user.lockoutUntil = new Date(now.getTime() + 5 * 60 * 1e3);
          }
          await user.save();
        }
        log(`Login FAIL: ${matricula}`, "ERROR");
        incrementIpFailure(req.ip);
        return res.status(401).json({ error: "Matr\xEDcula ou senha inv\xE1lidos" });
      }
      user.failedLoginAttempts = 0;
      user.lockoutUntil = void 0;
      await user.save();
      const ip_address = req.ip || req.socket.remoteAddress || "Unknown";
      const device = req.headers["user-agent"] || "Unknown";
      await finalizeLogin(user, ip_address, device, res);
      return;
    }
    log(`Login FAIL: ${matricula} (Not found)`, "ERROR");
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Matr\xEDcula ou senha inv\xE1lidos" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Login DB Error: ${errMsg}`, "ERROR");
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});
async function finalizeLogin(user, ip_address, device, res) {
  log(`Login SUCCESS: ${user.username}`);
  try {
    await LoginHistory.create({ id: uuidv43(), username: user.username, ip_address, device });
    logAudit("LOGIN", user.username, { ip: ip_address, device });
  } catch (e) {
    log(`Failed to log login history: ${e}`, "ERROR");
  }
  const secret = process.env.JWT_SECRET;
  const tokenVersion = user.tokenVersion || 0;
  const token = jwt3.sign(
    { id: user.id, username: user.username, role: user.role || "Usu\xE1rio", tokenVersion },
    secret,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt3.sign(
    { id: user.id, tokenVersion },
    secret,
    { expiresIn: "7d" }
  );
  const isLocalhost = res.req ? isLocalHostOrPrivateIP(res.req.hostname) : false;
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: "lax",
    maxAge: 15 * 60 * 1e3
    // 15 min
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: "lax",
    maxAge: 7 * 24 * 36e5
    // 7 dias
  });
  return res.json({
    success: true,
    user: { id: user.id, username: user.username, matricula: user.matricula, role: user.role || "Usu\xE1rio" }
  });
}
router.post("/refresh", async (req, res) => {
  let refreshToken = req.body?.refreshToken;
  if (!refreshToken && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, cookie) => {
      const [name, val] = cookie.split("=").map((c) => c.trim());
      acc[name] = val;
      return acc;
    }, {});
    refreshToken = cookies["refresh_token"];
  }
  if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });
  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt3.verify(refreshToken, secret, { algorithms: ["HS256"] });
    const user = await User.findOne({ id: decoded.id });
    if (!user) return res.status(401).json({ error: "Usu\xE1rio inexistente ou revogado" });
    if (decoded.tokenVersion !== void 0 && user.tokenVersion !== decoded.tokenVersion) {
      logAudit("REFRESH_REVOKED", user.username, { expected: user.tokenVersion, received: decoded.tokenVersion });
      return res.status(401).json({ error: "Refresh token revogado pelo administrador" });
    }
    const newToken = jwt3.sign(
      { id: user.id, username: user.username, role: user.role || "Usu\xE1rio", tokenVersion: user.tokenVersion || 0 },
      secret,
      { expiresIn: "15m" }
    );
    const isLocalhost = isLocalHostOrPrivateIP(req.hostname);
    res.cookie("access_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      sameSite: "lax",
      maxAge: 15 * 60 * 1e3
    });
    return res.json({ success: true });
  } catch (error) {
    incrementIpFailure(req.ip);
    return res.status(401).json({ error: "Refresh token inv\xE1lido, adulterado ou expirado" });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ success: true });
});
router.delete("/blacklist/:ip", requireAuth, requireSuperAdmin, async (req, res) => {
  const { ip } = req.params;
  if (!redis_default || !redis_default.isOpen) {
    return res.status(500).json({ error: "Redis indispon\xEDvel" });
  }
  try {
    await redis_default.sRem("ip_blacklist", ip);
    await redis_default.del(`ip_fails:${ip}`);
    logAudit("IP_REMOVED_FROM_BLACKLIST", req.user?.username || "SuperAdmin", { targetIp: ip });
    return res.json({ success: true, message: `IP ${ip} removido da blacklist.` });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover IP da blacklist" });
  }
});
var auth_routes_default = router;

// src/routes/ticket.routes.ts
import { Router as Router2 } from "express";
import multer from "multer";
import path2 from "path";
import fs from "fs";
import { v4 as uuidv44 } from "uuid";
import { fileTypeFromFile } from "file-type";
import rateLimit3 from "express-rate-limit";
import { RedisStore as RedisStore3 } from "rate-limit-redis";

// src/services/TicketService.ts
import crypto2 from "crypto";
var safeLean = async (query) => {
  return typeof query.lean === "function" ? await query.lean() : await query;
};
var TicketService = class {
  constructor() {
    this.TICKETS_CACHE_KEY = "api:tickets:all";
    this.TICKETS_STATS_CACHE_KEY = "api:tickets:stats";
  }
  async clearCache() {
    try {
      if (redis_default.isOpen) {
        await redis_default.del([this.TICKETS_CACHE_KEY, this.TICKETS_STATS_CACHE_KEY]);
      }
    } catch (err) {
      log(`Redis Cache Clear Error: ${err}`, "ERROR");
    }
  }
  async createTicket(data, image_path, operator_name) {
    const { type, location, agv_number, part_name, sap_number, side, observation, operator_matricula, impact, downtime } = data;
    const id = `TK-${crypto2.randomInt(1e3, 9999)}`;
    let priority = "Baixo";
    const isCriticalLoc = ["ASSEMBLY-01", "BODY-SHOP", "QC-LINE"].includes(location);
    if (type === "Colis\xE3o") priority = "Cr\xEDtico";
    else if (impact === "total") priority = "Cr\xEDtico";
    else if (impact === "partial") priority = isCriticalLoc || type === "AGV com falha" ? "Alto" : "M\xE9dio";
    else if (type === "AGV com falha" && isCriticalLoc) priority = "Alto";
    else if (type === "AGV com falha") priority = "M\xE9dio";
    else if (type === "Falta de pe\xE7as" || type === "Painel/Botoeira") priority = "M\xE9dio";
    await Ticket.create({
      id,
      type,
      location,
      agv_number,
      part_name,
      sap_number,
      side,
      observation,
      image_path,
      operator_name,
      operator_matricula,
      priority,
      operational_impact: impact,
      downtime
    });
    logAudit("OPEN_TICKET", operator_name || "Operator", { ticketId: id, type });
    await notifyUsersAboutTicket({ id, type, location, impact, operator_name }, priority);
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(type);
    } catch (e) {
    }
    return id;
  }
  async getStats(user) {
    const baseQuery = {};
    if (user.role === "Moderador") {
      baseQuery.type = { $in: user.allowedTicketTypes || [] };
    }
    const matchStage = Object.keys(baseQuery).length > 0 ? [{ $match: baseQuery }] : [];
    const statusPipeline = [...matchStage, { $group: { _id: "$status", count: { $sum: 1 } } }];
    const priorityPipeline = [...matchStage, { $group: { _id: "$priority", count: { $sum: 1 } } }];
    const [statusCounts, priorityCounts] = await Promise.all([
      Ticket.aggregate(statusPipeline),
      Ticket.aggregate(priorityPipeline)
    ]);
    const statusMap = {};
    for (const item of statusCounts) statusMap[item._id || "Unknown"] = item.count;
    const priorityMap = {};
    for (const item of priorityCounts) priorityMap[item._id || "Unknown"] = item.count;
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    return {
      total,
      open: statusMap["Aberto"] || 0,
      pending: statusMap["Em atendimento"] || 0,
      finished: statusMap["Finalizado"] || 0,
      critical: priorityMap["Cr\xEDtico"] || 0,
      high: priorityMap["Alto"] || 0
    };
  }
  async exportCSV(user) {
    const baseQuery = {};
    if (user.role === "Moderador") {
      baseQuery.type = { $in: user.allowedTicketTypes || [] };
    }
    const cursor = Ticket.find(baseQuery).sort({ created_at: -1 }).lean().cursor();
    const escape = (str) => `"${(str || "").replace(/"/g, '""')}"`;
    let csvStr = "ID,Type,Status,Priority,Location,Operator,Matricula,Created_At,Resolved_At,MTTR_Min\n";
    for await (const t of cursor) {
      const createdAt = new Date(t.created_at).toISOString();
      const resolvedAt = t.resolved_at ? new Date(t.resolved_at).toISOString() : "";
      let mttr = "";
      if (t.created_at && t.resolved_at) {
        mttr = Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 6e4).toString();
      }
      csvStr += `${t.id},${escape(t.type)},${t.status},${t.priority},${escape(t.location)},${escape(t.operator_name)},${escape(t.operator_matricula)},${createdAt},${resolvedAt},${mttr}
`;
    }
    return csvStr;
  }
  buildFilter(query, user) {
    const filter = {};
    const { status, type, priority, search, start, end } = query;
    if (status && status !== "all") {
      const statusList = String(status).split(",");
      filter.status = statusList.length > 1 ? { $in: statusList } : status;
    }
    const isModerador = user.role === "Moderador";
    const allowedTypes = user.allowedTicketTypes || [];
    if (type && type !== "all") {
      const typeStr = String(type);
      filter.type = isModerador ? allowedTypes.includes(typeStr) ? typeStr : { $in: [] } : typeStr;
    } else if (isModerador) {
      filter.type = { $in: allowedTypes };
    }
    if (priority && priority !== "all") filter.priority = String(priority);
    if (search) {
      const sanitizedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { id: { $regex: sanitizedSearch, $options: "i" } },
        { location: { $regex: sanitizedSearch, $options: "i" } },
        { operator_name: { $regex: sanitizedSearch, $options: "i" } },
        { operator_matricula: { $regex: sanitizedSearch, $options: "i" } }
      ];
    }
    if (start || end) {
      filter.created_at = {};
      if (start) filter.created_at.$gte = new Date(String(start));
      if (end) filter.created_at.$lte = new Date(String(end));
    }
    return filter;
  }
  async getPaginatedTickets(filter, page, limit) {
    const skip = (page - 1) * limit;
    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter).select("-resolution_report -images -__v").sort({ created_at: -1 }).skip(skip).limit(limit).lean()
    ]);
    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async getTickets(filter) {
    return Ticket.find(filter).select("-resolution_report -images -__v").sort({ created_at: -1 }).lean();
  }
  async updateStatus(id, status, user) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado n\xE3o encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado n\xE3o permitido"), { status: 403 });
    }
    await Ticket.updateOne({ id }, { status });
    logAudit("CHANGE_STATUS", user.username, { ticketId: id, newStatus: status });
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(ticket.type);
    } catch (e) {
    }
  }
  async startTicket(id, assigned_to, user) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado n\xE3o encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado n\xE3o permitido"), { status: 403 });
    }
    const result = await Ticket.updateOne(
      { id, status: "Aberto" },
      { status: "Em atendimento", assigned_to, started_at: /* @__PURE__ */ new Date() }
    );
    if (result.modifiedCount === 0) {
      throw Object.assign(new Error("Chamado j\xE1 foi assumido por outro usu\xE1rio ou n\xE3o est\xE1 mais aberto"), { status: 409 });
    }
    logAudit("START_SERVICE", user.username, { ticketId: id, assignedTo: assigned_to });
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(ticket.type);
    } catch (e) {
    }
    return assigned_to;
  }
  async finishTicket(id, resolution_report, resolution_image_path, user) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado n\xE3o encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado n\xE3o permitido"), { status: 403 });
    }
    if (user.role !== "SuperAdmin" && user.role !== "Admin" && ticket.assigned_to !== user.username) {
      throw Object.assign(new Error("Apenas o respons\xE1vel ou admins podem finalizar"), { status: 403 });
    }
    const finishedAt = /* @__PURE__ */ new Date();
    await Ticket.updateOne(
      { id },
      { status: "Finalizado", finished_at: finishedAt, resolution_report, resolution_image_path }
    );
    logAudit("FINISH_SERVICE", user.username, { ticketId: id });
    await notifyUsersAboutTicketFinished({
      id: ticket.id,
      type: ticket.type,
      location: ticket.location,
      priority: ticket.priority,
      operator_name: ticket.operator_name,
      assigned_to: ticket.assigned_to,
      created_at: ticket.created_at,
      finished_at: finishedAt,
      resolution_report,
      finished_by: user.username
    });
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(ticket.type);
    } catch (e) {
    }
  }
  async updateTicket(id, data, user) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado n\xE3o encontrado"), { status: 404 });
    await Ticket.updateOne({ id }, data);
    logAudit("EDIT_TICKET", user.username, { ticketId: id, updates: data });
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(data.type || ticket.type);
    } catch (e) {
    }
  }
  async deleteTicket(id, user) {
    const ticketId = String(id).replace(/[${}]/g, "");
    const ticket = await safeLean(Ticket.findOne({ id: ticketId }));
    if (!ticket) throw Object.assign(new Error("Chamado n\xE3o encontrado"), { status: 404 });
    await Ticket.deleteOne({ id: ticketId });
    logAudit("DELETE_TICKET", user.username, { ticketId });
    await this.clearCache();
    try {
      await emitSelectiveTicketsUpdated(ticket.type);
    } catch (e) {
    }
    return [ticket.image_path, ticket.resolution_image_path].filter(Boolean);
  }
};
var ticketService = new TicketService();

// src/utils/imageValidator.ts
import path from "path";
function isValidImage(originalname, mimetype) {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(originalname).toLowerCase();
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  return allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimetype);
}

// src/routes/ticket.routes.ts
var router2 = Router2();
var localLimiter2 = rateLimit3({
  store: process.env.NODE_ENV === "test" ? void 0 : new RedisStore3({
    prefix: "rl:ticket-local:",
    sendCommand: (...args) => redis_default.sendCommand(args)
  }),
  windowMs: 15 * 60 * 1e3,
  max: 100,
  message: "Too many requests, please try again later."
});
var storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv44()}${path2.extname(file.originalname)}`)
});
var upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});
var SAFE_FILENAME_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|webp)$/i;
function safeDeleteUploadFile(rawInput) {
  const filename = path2.basename(rawInput);
  if (!SAFE_FILENAME_REGEX.test(filename)) return;
  const uploadsDir = path2.resolve(UPLOAD_DIR);
  try {
    const existingFiles = fs.readdirSync(uploadsDir);
    if (existingFiles.includes(filename)) {
      fs.unlinkSync(path2.join(uploadsDir, filename));
      log(`File deleted securely: ${filename}`);
    }
  } catch {
  }
}
function safeUnlinkReqFile(reqFile) {
  if (reqFile?.filename) safeDeleteUploadFile(reqFile.filename);
}
router2.post("/", localLimiter2, publicLimiter, apiLimiter, upload.single("image"), asyncHandler(async (req, res) => {
  if (await isMaintenanceMode()) {
    safeUnlinkReqFile(req.file);
    return res.status(503).json({ error: "O sistema est\xE1 em manuten\xE7\xE3o programada." });
  }
  if (req.file) {
    if (!isValidImage(req.file.originalname, req.file.mimetype)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Extens\xE3o de arquivo n\xE3o permitida." });
    }
    const meta = await fileTypeFromFile(req.file.path);
    if (meta && !["image/jpeg", "image/png", "image/webp"].includes(meta.mime)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Arquivo inv\xE1lido ou n\xE3o \xE9 uma imagem." });
    }
  }
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Dados inv\xE1lidos.", details: parsed.error.format() });
  }
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;
  const ticketId = await ticketService.createTicket(parsed.data, image_path, parsed.data.operator_name || "Operator");
  res.status(201).json({ success: true, ticketId });
}));
router2.get("/stats", requireAuth, asyncHandler(async (req, res) => {
  const stats = await ticketService.getStats(req.user);
  res.json(stats);
}));
router2.get("/export", requireAuth, asyncHandler(async (req, res) => {
  const csvStr = await ticketService.exportCSV(req.user);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="tickets_export.csv"');
  res.status(200).send(csvStr);
}));
router2.get("/", requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(String(req.query.page || "1"), 10) || 1;
  const limit = parseInt(String(req.query.limit || "0"), 10) || 0;
  const filter = ticketService.buildFilter(req.query, req.user);
  if (limit > 0) {
    const paginated = await ticketService.getPaginatedTickets(filter, page, limit);
    return res.json(paginated);
  }
  const tickets = await ticketService.getTickets(filter);
  res.json(tickets);
}));
router2.patch("/:id/status", requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === "Usu\xE1rio") {
    return res.status(403).json({ error: "Usu\xE1rios n\xE3o podem alterar status." });
  }
  const parsed = ticketStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Status inv\xE1lido." });
  await ticketService.updateStatus(req.params.id, parsed.data.status, req.user);
  res.json({ success: true });
}));
router2.patch("/:id/start", requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === "Usu\xE1rio") {
    return res.status(403).json({ error: "Usu\xE1rios n\xE3o podem iniciar atendimento." });
  }
  let assigned_to = req.body.assigned_to;
  if (req.user.role !== "SuperAdmin" && req.user.role !== "Admin") {
    assigned_to = req.user.username;
  }
  if (!assigned_to) return res.status(400).json({ error: "Respons\xE1vel obrigat\xF3rio" });
  const assigned = await ticketService.startTicket(req.params.id, assigned_to, req.user);
  res.json({ success: true, assigned_to: assigned });
}));
var handleResolutionUpload = (req, res, next) => {
  upload.single("resolution_image")(req, res, (err) => {
    if (err) return res.status(413).json({ error: "Arquivo excede 5MB" });
    next();
  });
};
router2.patch("/:id/finish", requireAuth, localLimiter2, apiLimiter, handleResolutionUpload, asyncHandler(async (req, res) => {
  if (req.user.role === "Usu\xE1rio") {
    safeUnlinkReqFile(req.file);
    return res.status(403).json({ error: "Usu\xE1rios n\xE3o podem finalizar chamados." });
  }
  const { resolution_report } = req.body;
  if (!resolution_report) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Relat\xF3rio obrigat\xF3rio" });
  }
  if (typeof resolution_report === "string" && (resolution_report.includes("<script>") || resolution_report.includes("javascript:"))) {
    safeUnlinkReqFile(req.file);
    return res.status(400).json({ error: "Conte\xFAdo malicioso detectado no relat\xF3rio." });
  }
  if (req.file) {
    if (!isValidImage(req.file.originalname, req.file.mimetype)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Extens\xE3o de arquivo n\xE3o permitida." });
    }
    const meta = await fileTypeFromFile(req.file.path);
    if (meta && !["image/jpeg", "image/png", "image/webp"].includes(meta.mime)) {
      safeUnlinkReqFile(req.file);
      return res.status(400).json({ error: "Arquivo inv\xE1lido ou n\xE3o \xE9 uma imagem." });
    }
  }
  const resolution_image_path = req.file ? `/uploads/${req.file.filename}` : null;
  await ticketService.finishTicket(req.params.id, resolution_report, resolution_image_path, req.user);
  res.json({ success: true });
}));
router2.put("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = ticketUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inv\xE1lidos" });
  await ticketService.updateTicket(req.params.id, parsed.data, req.user);
  res.json({ success: true });
}));
router2.delete("/:id", requireAuth, requireAdmin, localLimiter2, apiLimiter, asyncHandler(async (req, res) => {
  const filesToDelete = await ticketService.deleteTicket(req.params.id, req.user);
  for (const fp of filesToDelete) {
    try {
      safeDeleteUploadFile(fp);
    } catch {
    }
  }
  res.json({ success: true });
}));
var ticket_routes_default = router2;

// src/routes/user.routes.ts
import { Router as Router3 } from "express";

// src/services/UserService.ts
import argon23 from "argon2";
import { v4 as uuidv45 } from "uuid";
var UserService = class {
  constructor() {
    this.USERS_CACHE_KEY = "api:users:list";
  }
  async clearCache() {
    try {
      if (redis_default.isOpen) await redis_default.del(this.USERS_CACHE_KEY);
    } catch (err) {
      log(`Redis Cache Clear Error: ${err}`, "ERROR");
    }
  }
  async createUser(data, currentUser) {
    const { username, matricula, password, role, email, notificationPreference, allowedTicketTypes } = data;
    if (notificationPreference === "email") {
      if (!email) throw Object.assign(new Error("E-mail \xE9 obrigat\xF3rio para esta prefer\xEAncia."), { status: 400 });
    }
    const existingByMatricula = await User.findOne({ matricula });
    if (existingByMatricula) {
      throw Object.assign(new Error("Matr\xEDcula j\xE1 est\xE1 em uso"), { status: 400 });
    }
    const userRole = role || "Usu\xE1rio";
    if (userRole === "SuperAdmin" || userRole === "Admin") {
      if (currentUser.role !== "SuperAdmin") {
        throw Object.assign(new Error("Apenas SuperAdmins podem criar novos Administradores ou SuperAdmins"), { status: 403 });
      }
    }
    const hashedPassword = await argon23.hash(password);
    const id = uuidv45();
    await User.create({
      id,
      username,
      matricula,
      password: hashedPassword,
      role: userRole,
      email,
      notificationPreference,
      allowedTicketTypes: allowedTicketTypes || []
    });
    log(`User created: ${username}`);
    await this.clearCache();
    return { id, username, role: userRole, notificationPreference, allowedTicketTypes: allowedTicketTypes || [] };
  }
  async getUsers() {
    return User.find({}, { _id: 0, id: 1, username: 1, matricula: 1, role: 1, email: 1, notificationPreference: 1, allowedTicketTypes: 1 }).sort({ username: 1 }).lean();
  }
  async deleteUser(id, currentUser) {
    const user = await User.findOne({ id });
    if (!user) throw Object.assign(new Error("Usu\xE1rio n\xE3o encontrado"), { status: 404 });
    if (user.role === "SuperAdmin" && currentUser.role !== "SuperAdmin") {
      throw Object.assign(new Error("Voc\xEA n\xE3o tem permiss\xE3o para excluir um SuperAdmin"), { status: 403 });
    }
    if (user.username.toLowerCase() === "axionadmin") {
      throw Object.assign(new Error("N\xE3o \xE9 poss\xEDvel excluir o administrador padr\xE3o"), { status: 400 });
    }
    await User.deleteOne({ id });
    log(`User deleted: ${user.username}`);
    await this.clearCache();
  }
  async updateUser(id, data, currentUser) {
    const { username, matricula, role, email, notificationPreference, password, allowedTicketTypes } = data;
    const user = await User.findOne({ id });
    if (!user) throw Object.assign(new Error("Usu\xE1rio n\xE3o encontrado"), { status: 404 });
    if (user.role === "SuperAdmin" && currentUser.role !== "SuperAdmin") {
      throw Object.assign(new Error("Voc\xEA n\xE3o tem permiss\xE3o para editar um SuperAdmin"), { status: 403 });
    }
    if (role === "SuperAdmin" || role === "Admin") {
      if (currentUser.role !== "SuperAdmin") {
        throw Object.assign(new Error("Apenas SuperAdmins podem conceder o cargo Admin ou SuperAdmin"), { status: 403 });
      }
    }
    if (username) user.username = username;
    if (matricula && matricula !== user.matricula) {
      const existingByMatricula = await User.findOne({ matricula });
      if (existingByMatricula) throw Object.assign(new Error("Matr\xEDcula j\xE1 est\xE1 em uso"), { status: 400 });
      user.matricula = matricula;
    }
    if (role) user.role = role;
    if (email !== void 0) user.email = email;
    if (notificationPreference) user.notificationPreference = notificationPreference;
    if (allowedTicketTypes !== void 0) user.allowedTicketTypes = allowedTicketTypes;
    if (password) {
      if (typeof password !== "string" || password.length < 8 || password.length > 64) {
        throw Object.assign(new Error("A senha deve ter no m\xEDnimo 8 caracteres"), { status: 400 });
      }
      user.password = await argon23.hash(password);
    }
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    log(`User updated: ${user.username}`);
    await this.clearCache();
    return { id: user.id, username: user.username, role: user.role, notificationPreference: user.notificationPreference, allowedTicketTypes: user.allowedTicketTypes };
  }
};
var userService = new UserService();

// src/routes/user.routes.ts
var router3 = Router3();
var redisBreaker = new CircuitBreaker("redis-users", 3, 1e4);
router3.post("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inv\xE1lidos ou senha curta" });
  const user = await userService.createUser(parsed.data, req.user);
  res.json({ success: true, user });
}));
router3.get("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 0;
  if (limit > 1e3) return res.status(400).json({ error: "Limite m\xE1ximo de registros excedido." });
  try {
    const cached = await redisBreaker.fire(
      () => redis_default.get("api:users:list"),
      () => Promise.resolve(null)
    );
    if (cached) return res.json(JSON.parse(cached));
  } catch {
  }
  const users = await userService.getUsers();
  try {
    await redisBreaker.fire(
      () => redis_default.setEx("api:users:list", 60, JSON.stringify(users)),
      () => Promise.resolve("")
    );
  } catch {
  }
  res.json(users);
}));
router3.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user);
  res.json({ success: true });
}));
router3.put("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.json({ success: true, user });
}));
var user_routes_default = router3;

// src/routes/feedback.routes.ts
import { Router as Router4 } from "express";
import { v4 as uuidv46 } from "uuid";
var router4 = Router4();
router4.post("/", publicLimiter2, async (req, res) => {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    const { matricula, name, feedback } = parsed.data;
    const id = uuidv46();
    await OperatorFeedback.create({ id, matricula, name, feedback });
    log(`Feedback recebido de: ${name}`);
    try {
      await redis_default.del("api:feedback:list");
    } catch {
    }
    res.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Create Feedback Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao enviar feedback" });
  }
});
router4.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    try {
      const cached = await redis_default.get("api:feedback:list");
      if (cached) return res.json(JSON.parse(cached));
    } catch {
    }
    const feedbacks = await OperatorFeedback.find().sort({ created_at: -1 }).limit(500).lean();
    try {
      await redis_default.setEx("api:feedback:list", 60, JSON.stringify(feedbacks));
    } catch {
    }
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar feedbacks" });
  }
});
var feedback_routes_default = router4;

// src/routes/audit.routes.ts
import { Router as Router5 } from "express";
import { v4 as uuidv47 } from "uuid";
var router5 = Router5();
router5.get("/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    try {
      const cached = await redis_default.get("api:audit:logs");
      if (cached) return res.json(JSON.parse(cached));
    } catch {
    }
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean();
    try {
      await redis_default.setEx("api:audit:logs", 30, JSON.stringify(logs));
    } catch {
    }
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});
router5.get("/login-history", requireAuth, requireAdmin, async (req, res) => {
  try {
    try {
      const cached = await redis_default.get("api:audit:login-history");
      if (cached) return res.json(JSON.parse(cached));
    } catch {
    }
    const history = await LoginHistory.find().sort({ timestamp: -1 }).limit(500).lean();
    try {
      await redis_default.setEx("api:audit:login-history", 30, JSON.stringify(history));
    } catch {
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar hist\xF3rico" });
  }
});
router5.post("/click", publicLimiter2, async (req, res) => {
  try {
    const { target, url, action, username } = req.body;
    if (typeof target !== "string" || target.length > 200 || url && typeof url !== "string" || url && url.length > 500 || action && typeof action !== "string") {
      return res.status(400).json({ error: "Dados inv\xE1lidos" });
    }
    const logEntry = {
      id: `TRK-${uuidv47().substring(0, 8)}`,
      action: action || "UI_CLICK",
      username: username || req.user?.username || "An\xF4nimo",
      details: { target, url },
      timestamp: /* @__PURE__ */ new Date()
    };
    await AuditLog.create(logEntry);
    try {
      await redis_default.del("api:audit:logs");
    } catch {
    }
    res.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Tracker Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao registrar evento" });
  }
});
var audit_routes_default = router5;

// src/routes/apm.routes.ts
import { Router as Router6 } from "express";

// src/services/ApmService.ts
import { v4 as uuidv48 } from "uuid";

// src/utils/intelligence.ts
function analyzeSystemHealth(metrics) {
  const recommendations = [];
  const findings = [];
  let score = 100;
  if (metrics.avgCpu > 0.85) {
    score -= 30;
    findings.push("Carga de CPU extremamente alta detectada consistentemente.");
    recommendations.push("Escalonamento vertical (mais cores) ou otimiza\xE7\xE3o de loops pesados no backend.");
  } else if (metrics.avgCpu > 0.6) {
    score -= 10;
    findings.push("Uso de CPU acima da m\xE9dia observada.");
    recommendations.push("Verifique se h\xE1 processos de processamento de imagem ou relat\xF3rios que podem ser movidos para workers em background.");
  }
  if (metrics.avgRam > 90) {
    score -= 25;
    findings.push("Mem\xF3ria do sistema quase saturada.");
    recommendations.push("Verifique poss\xEDveis memory leaks no Node.js ou aumente a RAM do servidor.");
  }
  if (metrics.avgLatency > 1e3) {
    score -= 20;
    findings.push("Lat\xEAncia de API degradada (T > 1s).");
    recommendations.push("Otimize as rotas de busca de tickets; implemente pagina\xE7\xE3o mais agressiva ou cache de borda.");
  } else if (metrics.dbLatency > 100) {
    score -= 15;
    findings.push("Consultas ao MongoDB apresentando lentid\xE3o.");
    recommendations.push("Adicione \xEDndices nos campos mais filtrados (ex: status, type, location) e revise o pool de conex\xF5es.");
  }
  if (metrics.errorRate > 10) {
    score -= 25;
    findings.push("Taxa de erros HTTP alarmante (>10%).");
    recommendations.push("Revise os logs de erro para identificar falhas recorrentes em integra\xE7\xF5es ou valida\xE7\xF5es de formul\xE1rio.");
  }
  let riskLevel = "Low";
  let status = "Saud\xE1vel";
  if (score < 40) {
    riskLevel = "Critical";
    status = "Cr\xEDtico - Interven\xE7\xE3o Imediata";
  } else if (score < 65) {
    riskLevel = "High";
    status = "Alerta - Risco de Instabilidade";
  } else if (score < 85) {
    riskLevel = "Medium";
    status = "Aten\xE7\xE3o - Oportunidade de Otimiza\xE7\xE3o";
  }
  if (recommendations.length === 0) {
    recommendations.push("Mantenha as rotinas de limpeza de log e backup do banco de dados.");
  }
  return {
    riskLevel,
    score: Math.max(0, score),
    status,
    recommendations,
    findings
  };
}

// src/services/ApmService.ts
import argon24 from "argon2";
import fs2 from "fs";
import path3 from "path";
var ApmService = class {
  async flushRedis() {
    if (!redis_default.isOpen) throw Object.assign(new Error("Redis indispon\xEDvel."), { status: 400 });
    await redis_default.flushDb();
    log("Redis DB flushed via APM dashboard", "WARN");
  }
  async getBlacklist() {
    if (!redis_default.isOpen) throw Object.assign(new Error("Redis indispon\xEDvel."), { status: 400 });
    return redis_default.sMembers("ip_blacklist");
  }
  async toggleMaintenance(enabled) {
    await setMaintenanceMode(enabled);
    return enabled;
  }
  async testNotifications(type, target) {
    if (!target) throw Object.assign(new Error("Destinat\xE1rio n\xE3o informado."), { status: 400 });
    if (type === "wecom") {
      log(`Disparando WeCom de teste via APM para ${target}`, "INFO");
      await sendWeComMessage(target, "\u2705 **AXION**: Este \xE9 um teste de notifica\xE7\xE3o do sistema via WeCom acionado pelo painel APM.\n\n\u{1F517} [Acessar Sistema AXION](https://app.axiontechnology.cloud)");
      return "Mensagem de teste do WeCom enviada com sucesso!";
    } else if (type === "email") {
      log(`Disparando E-mail de teste via APM para ${target}`, "INFO");
      await sendEmailMessage(target, "\u2705 AXION: Teste de Notifica\xE7\xE3o SMTP", "<p>Este \xE9 um teste de notifica\xE7\xE3o do sistema enviado pelo painel APM.</p>");
      return "E-mail de teste enviado com sucesso!";
    } else {
      throw Object.assign(new Error("Tipo de notifica\xE7\xE3o inv\xE1lido."), { status: 400 });
    }
  }
  async getMetricsHistory(hours) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1e3);
    return ApmMetric.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }).limit(2e3).lean();
  }
  async getReports() {
    return ApmReport.find().sort({ created_at: -1 }).lean();
  }
  async generateReport(range, start, end, username = "Admin") {
    let periodStart;
    let periodEnd = /* @__PURE__ */ new Date();
    if (range === "24h") periodStart = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    else if (range === "7d") periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    else if (range === "30d") periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
    else {
      periodStart = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1e3);
      periodEnd = end ? new Date(end) : /* @__PURE__ */ new Date();
    }
    const [metrics, auditLogs, tickets] = await Promise.all([
      ApmMetric.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean(),
      AuditLog.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean(),
      Ticket.find({ created_at: { $gte: periodStart, $lte: periodEnd } }).lean()
    ]);
    const avgCpu = metrics.reduce((a, b) => a + (b.cpu_usage || 0), 0) / (metrics.length || 1);
    const avgLatency = metrics.reduce((a, b) => a + (b.avg_latency_ms || 0), 0) / (metrics.length || 1);
    const avgRam = metrics.reduce((a, b) => a + b.ram_used_mb / b.ram_total_mb * 100, 0) / (metrics.length || 1);
    const avgDbLatency = metrics.reduce((a, b) => a + (b.db_response_time_ms || 0), 0) / (metrics.length || 1);
    const errorCount = auditLogs.filter((l) => l.action.includes("ERROR") || l.action.includes("FAILED")).length;
    const errorRate = errorCount / (auditLogs.length || 1) * 100;
    const diagnosis = analyzeSystemHealth({
      avgCpu,
      avgRam,
      errorRate,
      avgLatency,
      dbLatency: avgDbLatency
    });
    const report = await ApmReport.create({
      id: `REP-${uuidv48().split("-")[0].toUpperCase()}`,
      title: `Relat\xF3rio de Sa\xFAde - ${range.toUpperCase()}`,
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: username,
      risk_level: diagnosis.riskLevel,
      health_score: diagnosis.score,
      summary: {
        avg_cpu: avgCpu.toFixed(2),
        avg_latency: Math.round(avgLatency),
        total_tickets: tickets.length,
        total_errors: errorCount,
        uptime_percent: 99.9,
        findings: diagnosis.findings
      },
      recommendations: diagnosis.recommendations,
      metrics_snapshots: metrics.slice(-20)
    });
    return report;
  }
  async clearDb(password, user, ip) {
    if (!password) throw Object.assign(new Error("Senha obrigat\xF3ria."), { status: 400 });
    const admin = await User.findOne({ username: user.username });
    if (!admin) throw Object.assign(new Error("Administrador n\xE3o encontrado."), { status: 404 });
    const passwordMatch = await argon24.verify(admin.password, password);
    if (!passwordMatch) {
      logAudit("FAILED_DB_WIPE", user.username, { ip });
      throw Object.assign(new Error("Senha incorreta."), { status: 403 });
    }
    logAudit("DATABASE_WIPE_INITIATED", user.username, { ip, status: "INITIATED", timestamp_start: (/* @__PURE__ */ new Date()).toISOString() });
    log("\u26A0\uFE0F INICIANDO WIPE GLOBAL DO BANCO DE DADOS PELO APM...", "WARN");
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await LoginHistory.deleteMany({});
    await AuditLog.deleteMany({});
    await OperatorFeedback.deleteMany({});
    if (fs2.existsSync(UPLOAD_DIR)) {
      const files = await fs2.promises.readdir(UPLOAD_DIR);
      await Promise.all(files.map(async (file) => {
        if (file !== ".gitkeep" && file !== ".gitignore") {
          try {
            await fs2.promises.unlink(path3.join(UPLOAD_DIR, file));
          } catch (e) {
          }
        }
      }));
    }
    await seedAdmin();
    logAudit("DATABASE_WIPE_COMPLETED", user.username, { ip, status: "COMPLETED", timestamp_end: (/* @__PURE__ */ new Date()).toISOString() });
    try {
      if (admin.email && admin.notificationPreference === "email") {
        await sendEmailMessage(admin.email, "\u26A0\uFE0F ALERTA CR\xCDTICO: Database Wipe Executado", `O banco de dados foi completamente limpo por ${user.username} em ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}.<br/>IP: ${ip}`);
      }
    } catch (notifErr) {
      log(`Notification after DB wipe failed: ${notifErr}`, "WARN");
    }
  }
};
var apmService = new ApmService();

// src/routes/apm.routes.ts
var router6 = Router6();
router6.post("/flush-redis", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  await apmService.flushRedis();
  res.json({ success: true, message: "Cache do Redis limpo com sucesso!" });
}));
router6.get("/blacklist", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const ips = await apmService.getBlacklist();
  res.json(ips);
}));
router6.post("/maintenance", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const enabled = await apmService.toggleMaintenance(!!req.body.enabled);
  res.json({ success: true, maintenance: enabled });
}));
router6.post("/test-notifications", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const message = await apmService.testNotifications(req.body.type, req.body.target);
  res.json({ success: true, message });
}));
router6.get("/metrics/history", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const metrics = await apmService.getMetricsHistory(Number(req.query.hours) || 24);
  res.json(metrics);
}));
router6.get("/reports", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const reports = await apmService.getReports();
  res.json(reports);
}));
router6.post("/reports/generate", requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const report = await apmService.generateReport(req.body.range || "24h", req.body.start, req.body.end, req.user.username);
  res.status(201).json(report);
}));
router6.post("/clear-db", requireAuth, requireSuperAdmin, localLimiter, apiLimiter, asyncHandler(async (req, res) => {
  await apmService.clearDb(req.body.password, req.user, req.ip || "");
  res.json({ success: true, message: "Banco de dados limpo com sucesso." });
}));
var apm_routes_default = router6;

// src/routes/webhook.routes.ts
import { Router as Router7 } from "express";
import { v4 as uuidv49 } from "uuid";
var router7 = Router7();
router7.use(requireAuth, requireAdmin);
router7.get("/", async (req, res) => {
  try {
    const webhooks = await WeComWebhook.find().sort({ created_at: -1 });
    res.json(webhooks);
  } catch (error) {
    log(`Erro ao buscar webhooks: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro interno ao buscar webhooks." });
  }
});
router7.post("/", async (req, res) => {
  try {
    const { name, url, ticketTypes } = req.body;
    if (!url) {
      return res.status(400).json({ error: "A URL do Webhook \xE9 obrigat\xF3ria." });
    }
    const newWebhook = new WeComWebhook({
      id: uuidv49(),
      name: name || "Novo Grupo",
      url,
      ticketTypes: ticketTypes || []
    });
    await newWebhook.save();
    res.status(201).json(newWebhook);
  } catch (error) {
    log(`Erro ao criar webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao criar integra\xE7\xE3o WeCom." });
  }
});
router7.put("/:id", async (req, res) => {
  try {
    const { name, url, ticketTypes } = req.body;
    if (!url) {
      return res.status(400).json({ error: "A URL do Webhook \xE9 obrigat\xF3ria." });
    }
    const updatedWebhook = await WeComWebhook.findOneAndUpdate(
      { id: req.params.id },
      { name, url, ticketTypes },
      { new: true }
    );
    if (!updatedWebhook) {
      return res.status(404).json({ error: "Webhook n\xE3o encontrado." });
    }
    res.json(updatedWebhook);
  } catch (error) {
    log(`Erro ao atualizar webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao atualizar integra\xE7\xE3o WeCom." });
  }
});
router7.delete("/:id", async (req, res) => {
  try {
    const deleted = await WeComWebhook.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ error: "Webhook n\xE3o encontrado." });
    }
    res.json({ message: "Webhook exclu\xEDdo com sucesso." });
  } catch (error) {
    log(`Erro ao excluir webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao excluir integra\xE7\xE3o WeCom." });
  }
});
var webhook_routes_default = router7;

// src/server.ts
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required.");
}
var UPLOAD_DIR = path4.resolve(process.cwd(), "uploads");
if (!fs3.existsSync(UPLOAD_DIR)) {
  fs3.mkdirSync(UPLOAD_DIR, { recursive: true });
}
var PORT = 3e3;
var app = express();
var localLimiter3 = rateLimit4({
  store: process.env.NODE_ENV === "test" ? void 0 : new RedisStore4({
    prefix: "rl:server-local:",
    sendCommand: (...args) => redis_default.sendCommand(args)
  }),
  windowMs: 15 * 60 * 1e3,
  max: 100,
  message: "Too many requests, please try again later."
});
app.set("trust proxy", 1);
connectMongoDB();
connectRedis();
app.use(helmet2({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  // HSTS — Força HTTPS por 1 ano em produção (inclui subdomínios)
  strictTransportSecurity: {
    maxAge: 31536e3,
    includeSubDomains: true,
    preload: true
  },
  // Desativa recursos desnecessários do navegador
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true
  // nosniff — previne MIME sniffing
}));
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  next();
});
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : "*" }));
app.use(compression({
  level: 6,
  threshold: 10 * 1024,
  filter: (req, res) => {
    const type = res.getHeader("Content-Type");
    if (type && /image|font|audio|video/.test(String(type))) return false;
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: "5mb" }));
app.use(contentTypeValidation);
app.use(globalSanitizer);
app.use(checkIpBlacklist);
app.use("/api", apiLimiter);
app.use(apmMiddleware);
app.use(csrfProtection);
app.get("/api/health/live", (req, res) => {
  res.status(200).json({ status: "alive", uptime: process.uptime() });
});
app.get("/api/health/ready", async (req, res) => {
  const dbStatus = mongoose5.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = redis_default.isOpen ? "connected" : "disconnected";
  const memoryUsage = process.memoryUsage();
  const isReady = dbStatus === "connected" && redisStatus === "connected";
  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    services: {
      mongodb: dbStatus,
      redis: redisStatus
    },
    system: {
      memory_total_mb: Math.round(os3.totalmem() / 1024 / 1024),
      memory_free_mb: Math.round(os3.freemem() / 1024 / 1024),
      memory_app_used_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      cpu_load: os3.loadavg()
    },
    apm: getApmMetrics(),
    maintenance: await isMaintenanceMode()
  });
});
app.get("/api/health", async (req, res) => {
  const dbStatus = mongoose5.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = redis_default.isOpen ? "connected" : "disconnected";
  const memoryUsage = process.memoryUsage();
  const isReady = dbStatus === "connected" && redisStatus === "connected";
  res.status(200).json({
    status: isReady ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    services: {
      database: dbStatus,
      mongodb: dbStatus,
      redis: redisStatus
    },
    system: {
      memory_total_mb: Math.round(os3.totalmem() / 1024 / 1024),
      memory_free_mb: Math.round(os3.freemem() / 1024 / 1024),
      memory_app_used_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      cpu_load: os3.loadavg(),
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
      }
    },
    apm: getApmMetrics(),
    maintenance: await isMaintenanceMode()
  });
});
app.use("/api", auth_routes_default);
app.use("/api/users", user_routes_default);
app.use("/api/tickets", ticket_routes_default);
app.use("/api/feedback", feedback_routes_default);
app.use("/api/apm", apm_routes_default);
app.use("/api/webhooks", webhook_routes_default);
app.use("/api", audit_routes_default);
app.get("/docs", localLimiter3, apiLimiter, (req, res) => {
  res.sendFile(path4.join(process.cwd(), "public", "docs.html"));
});
app.get("/api-docs.json", localLimiter3, apiLimiter, (req, res) => {
  res.sendFile(path4.join(process.cwd(), "public", "api-docs.json"));
});
app.use(globalErrorHandler);
app.use("/uploads", apiLimiter, express.static(UPLOAD_DIR));
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path4.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: "1y", immutable: true }));
    app.get(/.*/, localLimiter3, apiLimiter, (req, res) => res.sendFile(path4.join(distPath, "index.html")));
  }
  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    startSystemMonitor();
    startMetricsPersistence();
  });
  initSocket(httpServer);
}
if (process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV === "production" && cluster2.isPrimary) {
    const numCPUs = os3.cpus().length;
    log(`[CLUSTER] Primary Process PID: ${process.pid} is running.`);
    log(`[CLUSTER] Forking application across ${numCPUs} CPU cores...`);
    for (let i = 0; i < numCPUs; i++) {
      cluster2.fork();
    }
    cluster2.on("exit", (worker, code, signal) => {
      log(`[CLUSTER] Worker ${worker.process.pid} died (Code: ${code}, Signal: ${signal}). Starting a new worker...`, "WARN");
      cluster2.fork();
    });
  } else {
    startServer();
    if (process.env.NODE_ENV === "production") {
      log(`[CLUSTER] Worker PID: ${process.pid} successfully started.`);
    }
  }
}
export {
  UPLOAD_DIR,
  app
};
