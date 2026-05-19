import redisClient from "../config/redis";
import { getIO } from "../socket";
import { recentLogs } from "./logger";
import cluster from "cluster";
import os from "os";
import { ApmMetric } from "../models/mongoose";
import mongoose from "mongoose";

let avgLatencyMs = 0;
let requestCountMoving = 0;
let lastReset = Date.now();
let requestsPerMin = 0;
let errorCountMoving = 0;
let dbLatencyMs = 0;

export function recordApiMetrics(durationMs: number, isError: boolean) {
  const now = Date.now();
  if (now - lastReset > 60000) {
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

export function getApmMetrics() {
  let wsClients = 0;
  try {
    const io = getIO();
    if (io) {
      wsClients = io.of("/tenant-axion").sockets.size;
    }
  } catch (e) {
    // Socket.io not initialized
  }

  const currentRpm = requestsPerMin || requestCountMoving;
  const totalReqs = requestCountMoving;
  const errRate = totalReqs > 0 ? (errorCountMoving / totalReqs) * 100 : 0;

  const freeMem = os.freemem();
  const totalMem = os.totalmem();
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
    cpu_usage: os.loadavg()[0], // Load average de 1 min como proxy de CPU
    db_latency_ms: Math.round(dbLatencyMs)
  };
}

export function startMetricsPersistence() {
  // Apenas o processo principal (ou um worker específico) deve salvar no banco para evitar redundância
  if (cluster.isWorker && cluster.worker?.id !== 1) return;

  setInterval(async () => {
    try {
      // Medir latência do DB antes de salvar
      const startDb = Date.now();
      await mongoose.connection.db?.admin().ping();
      dbLatencyMs = Date.now() - startDb;

      const metrics = getApmMetrics();
      await ApmMetric.create({
        cpu_usage: metrics.cpu_usage,
        ram_used_mb: metrics.ram_used_mb,
        ram_total_mb: metrics.ram_total_mb,
        load_avg: os.loadavg(),
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
      // Falha silenciosa no log para não poluir
    }
  }, 60000 * 5); // A cada 5 minutos
}

let localMaintenanceMode = false;

export async function setMaintenanceMode(enabled: boolean) {
  localMaintenanceMode = enabled;
  try {
    if (redisClient.isOpen) {
      await redisClient.set("axion:maintenance", enabled ? "true" : "false");
    }
  } catch (e) {
    // Fallback silencioso
  }
}

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    if (redisClient.isOpen) {
      const val = await redisClient.get("axion:maintenance");
      if (val !== null) return val === "true";
    }
  } catch (e) {
    // Fallback silencioso
  }
  return localMaintenanceMode;
}

export function apmMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on("finish", () => {
    // Evita contar rotas estáticas ou de polling repetitivo de health nas médias se quisermos focar em tráfego real,
    // mas monitorar tudo dá a visão global de RPS. Vamos contar todas as requisições /api.
    if (req.originalUrl && req.originalUrl.startsWith("/api")) {
      const duration = Date.now() - start;
      const isError = res.statusCode >= 400;
      recordApiMetrics(duration, isError);
    }
  });

  next();
}
