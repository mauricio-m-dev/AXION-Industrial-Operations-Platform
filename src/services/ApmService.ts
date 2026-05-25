import redisClient from "../config/redis";
import { setMaintenanceMode } from "../utils/apmTracker";
import { sendWhatsAppMessage, sendEmailMessage } from "../utils/notifications";
import { ApmMetric, ApmReport, Ticket, AuditLog, User, LoginHistory, OperatorFeedback } from "../models/mongoose";
import { v4 as uuidv4 } from "uuid";
import { analyzeSystemHealth } from "../utils/intelligence";

import argon2 from "argon2";
import fs from "fs";
import path from "path";
import { seedAdmin } from "../config/mongo";
import { logAudit } from "../utils/audit";
import { log } from "../utils/logger";
import { UPLOAD_DIR } from "../server";

export class ApmService {
  public async flushRedis() {
    if (!redisClient.isOpen) throw Object.assign(new Error("Redis indisponível."), { status: 400 });
    await redisClient.flushDb();
    log("Redis DB flushed via APM dashboard", "WARN");
  }

  public async getBlacklist() {
    if (!redisClient.isOpen) throw Object.assign(new Error("Redis indisponível."), { status: 400 });
    return redisClient.sMembers("ip_blacklist");
  }

  public async toggleMaintenance(enabled: boolean) {
    await setMaintenanceMode(enabled);
    return enabled;
  }

  public async testNotifications(type: string, target: string) {
    if (!target) throw Object.assign(new Error("Destinatário não informado."), { status: 400 });
    
    if (type === "whatsapp") {
      log(`Disparando WhatsApp de teste via APM para ${target}`, "INFO");
      await sendWhatsAppMessage(target, "✅ *AXION*: Este é um teste de notificação do sistema via WhatsApp acionado pelo painel APM.");
      return "Mensagem de teste do WhatsApp enviada com sucesso!";
    } else if (type === "email") {
      log(`Disparando E-mail de teste via APM para ${target}`, "INFO");
      await sendEmailMessage(target, "✅ AXION: Teste de Notificação SMTP", "<p>Este é um teste de notificação do sistema enviado pelo painel APM.</p>");
      return "E-mail de teste enviado com sucesso!";
    } else {
      throw Object.assign(new Error("Tipo de notificação inválido."), { status: 400 });
    }
  }

  public async getMetricsHistory(hours: number) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return ApmMetric.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }).limit(2000).lean();
  }

  public async getReports() {
    return ApmReport.find().sort({ created_at: -1 }).lean();
  }

  public async generateReport(range: string, start?: string, end?: string, username: string = "Admin") {
    let periodStart: Date;
    let periodEnd = new Date();

    if (range === "24h") periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    else if (range === "7d") periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    else {
      periodStart = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      periodEnd = end ? new Date(end) : new Date();
    }

    const [metrics, auditLogs, tickets] = await Promise.all([
      ApmMetric.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean(),
      AuditLog.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean(),
      Ticket.find({ created_at: { $gte: periodStart, $lte: periodEnd } }).lean()
    ]);

    const avgCpu = metrics.reduce((a, b) => a + (b.cpu_usage || 0), 0) / (metrics.length || 1);
    const avgLatency = metrics.reduce((a, b) => a + (b.avg_latency_ms || 0), 0) / (metrics.length || 1);
    const avgRam = metrics.reduce((a, b) => a + ((b.ram_used_mb / b.ram_total_mb) * 100), 0) / (metrics.length || 1);
    const avgDbLatency = metrics.reduce((a, b) => a + (b.db_response_time_ms || 0), 0) / (metrics.length || 1);
    const errorCount = auditLogs.filter(l => l.action.includes("ERROR") || l.action.includes("FAILED")).length;
    const errorRate = (errorCount / (auditLogs.length || 1)) * 100;

    const diagnosis = analyzeSystemHealth({
      avgCpu, avgRam, errorRate, avgLatency, dbLatency: avgDbLatency
    });

    const report = await ApmReport.create({
      id: `REP-${uuidv4().split('-')[0].toUpperCase()}`,
      title: `Relatório de Saúde - ${range.toUpperCase()}`,
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



  public async clearDb(password: string, user: any, ip: string) {
    if (!password) throw Object.assign(new Error("Senha obrigatória."), { status: 400 });

    const admin = await User.findOne({ username: user.username });
    if (!admin) throw Object.assign(new Error("Administrador não encontrado."), { status: 404 });

    const passwordMatch = await argon2.verify(admin.password, password);
    if (!passwordMatch) {
      logAudit("FAILED_DB_WIPE", user.username, { ip });
      throw Object.assign(new Error("Senha incorreta."), { status: 403 });
    }

    logAudit("DATABASE_WIPE_INITIATED", user.username, { ip, status: "INITIATED", timestamp_start: new Date().toISOString() });
    log("⚠️ INICIANDO WIPE GLOBAL DO BANCO DE DADOS PELO APM...", "WARN");

    await User.deleteMany({});
    await Ticket.deleteMany({});
    await LoginHistory.deleteMany({});
    await AuditLog.deleteMany({});
    await OperatorFeedback.deleteMany({});

    if (fs.existsSync(UPLOAD_DIR)) {
      const files = await fs.promises.readdir(UPLOAD_DIR);
      await Promise.all(files.map(async (file) => {
        if (file !== '.gitkeep' && file !== '.gitignore') {
          try { await fs.promises.unlink(path.join(UPLOAD_DIR, file)); } catch(e) {}
        }
      }));
    }

    await seedAdmin();
    logAudit("DATABASE_WIPE_COMPLETED", user.username, { ip, status: "COMPLETED", timestamp_end: new Date().toISOString() });

    try {
      if (admin.whatsapp && admin.notificationPreference !== 'none') {
        await sendWhatsAppMessage(admin.whatsapp, `⚠️ ALERTA CRÍTICO AXION: Database Wipe executado por ${user.username} em ${new Date().toLocaleString('pt-BR')}. IP: ${ip}`);
      }
      if (admin.email && ['email', 'both'].includes(admin.notificationPreference || '')) {
        await sendEmailMessage(admin.email, '⚠️ ALERTA CRÍTICO: Database Wipe Executado', `O banco de dados foi completamente limpo por ${user.username} em ${new Date().toLocaleString('pt-BR')}.<br/>IP: ${ip}`);
      }
    } catch (notifErr) {
      log(`Notification after DB wipe failed: ${notifErr}`, "WARN");
    }
  }
}

export const apmService = new ApmService();
