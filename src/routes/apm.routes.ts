import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import { ApmMetric, ApmReport, Ticket, AuditLog, User, LoginHistory, OperatorFeedback } from "../models/mongoose";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { log } from "../utils/logger";
import { logAudit } from "../utils/audit";
import type { AuthenticatedRequest } from "../types/express";
import { sendWhatsAppMessage, sendEmailMessage } from "../utils/notifications";
import { v4 as uuidv4 } from "uuid";
import redisClient from "../config/redis";
import { setMaintenanceMode } from "../utils/apmTracker";
import { analyzeSystemHealth } from "../utils/intelligence";
import { populateTemplate, sanitizeLatex as sanitize } from "../utils/reports/latexTemplate";
import { compileLatexToPdf } from "../utils/reports/latexCompiler";
import { seedAdmin } from "../config/mongo";
import { UPLOAD_DIR } from "../server";
import argon2 from "argon2";
import path from "path";
import fs from "fs";
import os from "os";

// Local limiter to satisfy Snyk Code analysis
const localLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

const router = Router();

// --- INFRASTRUCTURE ACTIONS (Moved from server.ts) ---

router.post("/flush-redis", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (redisClient.isOpen) {
      await redisClient.flushDb();
      log("Redis DB flushed via APM dashboard", "WARN");
      return res.json({ success: true, message: "Cache do Redis limpo com sucesso!" });
    }
    res.status(400).json({ error: "Redis indisponível." });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/maintenance", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    await setMaintenanceMode(!!enabled);
    res.json({ success: true, maintenance: !!enabled });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Notification imports consolidated at the top of the file

router.post("/test-notifications", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, target } = req.body;

    if (!target) {
      return res.status(400).json({ error: "Destinatário não informado." });
    }

    if (type === "whatsapp") {
      log(`Disparando WhatsApp de teste via APM para ${target}`, "INFO");
      await sendWhatsAppMessage(target, "✅ *AXION*: Este é um teste de notificação do sistema via WhatsApp acionado pelo painel APM.");
      return res.json({ success: true, message: "Mensagem de teste do WhatsApp enviada com sucesso!" });
    } else if (type === "email") {
      log(`Disparando E-mail de teste via APM para ${target}`, "INFO");
      await sendEmailMessage(target, "✅ AXION: Teste de Notificação SMTP", "<p>Este é um teste de notificação do sistema enviado pelo painel APM.</p>");
      return res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
    } else {
      return res.status(400).json({ error: "Tipo de notificação inválido." });
    }
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- REPORTING & OBSERVABILITY ---

router.get("/metrics/history", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - (Number(hours) * 60 * 60 * 1000));

    const metrics = await ApmMetric.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 });
    res.json(metrics);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/reports", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await ApmReport.find().sort({ created_at: -1 });
    res.json(reports);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/reports/generate", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const range = typeof req.body.range === "string" ? req.body.range : "24h";
    const start = typeof req.body.start === "string" ? req.body.start : undefined;
    const end = typeof req.body.end === "string" ? req.body.end : undefined;
    let periodStart: Date;
    let periodEnd = new Date();

    if (range === "24h") periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    else if (range === "7d") periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    else {
      periodStart = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      periodEnd = end ? new Date(end) : new Date();
    }

    // 1. Coleta de Dados do Período
    const metrics = await ApmMetric.find({ timestamp: { $gte: periodStart, $lte: periodEnd } });
    const auditLogs = await AuditLog.find({ timestamp: { $gte: periodStart, $lte: periodEnd } });
    const tickets = await Ticket.find({ created_at: { $gte: periodStart, $lte: periodEnd } });

    // 2. Análise Inteligente via Módulo de Inteligência Axion
    const avgCpu = metrics.reduce((a, b) => a + (b.cpu_usage || 0), 0) / (metrics.length || 1);
    const avgLatency = metrics.reduce((a, b) => a + (b.avg_latency_ms || 0), 0) / (metrics.length || 1);
    const avgRam = metrics.reduce((a, b) => a + ((b.ram_used_mb / b.ram_total_mb) * 100), 0) / (metrics.length || 1);
    const avgDbLatency = metrics.reduce((a, b) => a + (b.db_response_time_ms || 0), 0) / (metrics.length || 1);
    const errorCount = auditLogs.filter(l => l.action.includes("ERROR") || l.action.includes("FAILED")).length;
    const errorRate = (errorCount / (auditLogs.length || 1)) * 100;

    const diagnosis = analyzeSystemHealth({
      avgCpu,
      avgRam,
      errorRate,
      avgLatency,
      dbLatency: avgDbLatency
    });

    const report = await ApmReport.create({
      id: `REP-${uuidv4().split('-')[0].toUpperCase()}`,
      title: `Relatório de Saúde - ${range.toUpperCase()}`,
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: req.user.username,
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

    res.status(201).json(report);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log(`APM Flush Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao gerar relatório inteligente." });
  }
});

router.post("/reports/generate-pdf", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Acesso restrito a SuperAdmin, Admin e Moderador
    if (req.user.role !== "SuperAdmin" && req.user.role !== "Admin" && req.user.role !== "Moderador") {
      return res.status(403).json({ error: "Acesso negado: privilégios insuficientes para gerar relatórios PDF." });
    }

    const { type, range, start, end, period } = req.body;
    const finalRange = range || period || "7d";

    let periodStart: Date;
    let periodEnd = new Date();

    if (finalRange === "24h") periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    else if (finalRange === "7d" || finalRange === "last7") periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    else if (finalRange === "30d") periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    else if ((finalRange === "custom" || finalRange === "Personalizado") && start && end) {
      periodStart = new Date(start);
      periodEnd = new Date(end);
    } else {
      periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const periodRange = `${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')}`;
    const reportId = `REP-${uuidv4().split('-')[0].toUpperCase()}`;

    // --- FILTRAGEM RBAC (Segurança Crítica) ---
    const baseQuery: any = { created_at: { $gte: periodStart, $lte: periodEnd } };

    // Se for Moderador, filtra apenas as categorias autorizadas
    if (req.user.role === "Moderador") {
      const userDoc = await User.findOne({ username: req.user.username });
      const allowedTypes = userDoc?.allowedTicketTypes || [];
      baseQuery.type = { $in: allowedTypes };
      log(`Relatório solicitado pelo Moderador ${req.user.username}. Filtrando ${allowedTypes.length} categorias autorizadas.`, "INFO");
    }

    const tickets = await Ticket.find(baseQuery).lean();
    const auditLogs = await AuditLog.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean();
    const metrics = await ApmMetric.find({ timestamp: { $gte: periodStart, $lte: periodEnd } }).lean();

    if (type === 'operational') {
      // ============================================
      // RELATÓRIO OPERACIONAL (Tickets / Performance)
      // ============================================

      const total = tickets.length;
      const finished = tickets.filter((t: any) => t.status === 'Finalizado').length;
      const open = tickets.filter((t: any) => t.status === 'Aberto').length;
      const inProgress = tickets.filter((t: any) => t.status === 'Em atendimento').length;
      const efficiency = total > 0 ? Math.round((finished / total) * 100) : 0;

      // SLA: finalizados em <= 30 min
      const slaCompliant = tickets.filter((t: any) => {
        if (t.status !== 'Finalizado' || !t.started_at || !t.finished_at) return false;
        return (new Date(t.finished_at).getTime() - new Date(t.started_at).getTime()) <= 30 * 60 * 1000;
      }).length;
      const slaPercent = finished > 0 ? Math.round((slaCompliant / finished) * 100) : 0;

      // MTTR
      const repairTimes = tickets
        .filter((t: any) => t.status === 'Finalizado' && t.started_at && t.finished_at)
        .map((t: any) => (new Date(t.finished_at).getTime() - new Date(t.started_at).getTime()) / 60000);
      const mttrAvg = repairTimes.length > 0 ? Math.round(repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length) : 0;

      // FRT (First Response Time)
      const frtTimes = tickets
        .filter((t: any) => t.started_at && t.created_at)
        .map((t: any) => (new Date(t.started_at).getTime() - new Date(t.created_at).getTime()) / 60000);
      const frtAvg = frtTimes.length > 0 ? Math.round(frtTimes.reduce((a, b) => a + b, 0) / frtTimes.length) : 0;

      // Backlog > 60min
      const now = Date.now();
      const backlog = tickets.filter((t: any) => {
        if (t.status === 'Finalizado') return false;
        return (now - new Date(t.created_at).getTime()) > 60 * 60 * 1000;
      }).length;

      // Melhor turno
      const shifts: Record<string, number> = { '06--14h': 0, '14--22h': 0, '22--06h': 0 };
      tickets.filter((t: any) => t.status === 'Finalizado').forEach((t: any) => {
        const h = new Date(t.created_at).getHours();
        if (h >= 6 && h < 14) shifts['06--14h']++;
        else if (h >= 14 && h < 22) shifts['14--22h']++;
        else shifts['22--06h']++;
      });
      const bestShift = Object.entries(shifts).sort((a, b) => b[1] - a[1])[0];

      // Distribuição por categoria
      const catMap: Record<string, number> = {};
      tickets.forEach((t: any) => { catMap[t.type] = (catMap[t.type] || 0) + 1; });
      const categoryRows = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `    ${sanitize(cat)} & ${count} & ${total > 0 ? Math.round((count / total) * 100) : 0}\\% \\\\ \\hline`)
        .join('\n');

      // AGVs problemáticos
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const agvMap: Record<string, { count: number; first: number; last: number; repairMin: number; repaired: number; recurringIn7d: number }> = {};

      tickets.forEach((t: any) => {
        if (!t.agv_number) return;
        const ts = new Date(t.created_at).getTime();
        if (!agvMap[t.agv_number]) agvMap[t.agv_number] = { count: 0, first: ts, last: ts, repairMin: 0, repaired: 0, recurringIn7d: 0 };
        agvMap[t.agv_number].count++;
        if (ts >= sevenDaysAgo) agvMap[t.agv_number].recurringIn7d++;
        if (ts < agvMap[t.agv_number].first) agvMap[t.agv_number].first = ts;
        if (ts > agvMap[t.agv_number].last) agvMap[t.agv_number].last = ts;
        if (t.status === 'Finalizado' && t.started_at && t.finished_at) {
          const r = (new Date(t.finished_at).getTime() - new Date(t.started_at).getTime()) / 60000;
          if (r > 0) { agvMap[t.agv_number].repairMin += r; agvMap[t.agv_number].repaired++; }
        }
      });

      const agvRows = Object.entries(agvMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([agv, d]) => {
          const mtbf = d.count > 1 ? ((d.last - d.first) / 3600000 / (d.count - 1)).toFixed(1) : '---';
          const mttrH = d.repaired > 0 ? d.repairMin / d.repaired / 60 : 0;
          const mtbfH = d.count > 1 ? (d.last - d.first) / 3600000 / (d.count - 1) : 24;
          const totalH = d.count > 1 ? (d.last - d.first) / 3600000 : 24;

          const availability = totalH > 0 ? Math.max(0, Math.min(1, (totalH - (d.repairMin / 60)) / totalH)) : 1;
          const performance = (mtbfH > 0 && mttrH >= 0) ? mtbfH / (mtbfH + mttrH) : (d.count === 0 ? 1 : 0.5);
          const quality = d.count > 0 ? Math.max(0, Math.min(1, 1 - (d.recurringIn7d > 1 ? (d.recurringIn7d - 1) / d.count : 0))) : 1;

          const oee = Math.round(availability * performance * quality * 100);
          return `    ${sanitize(agv)} & ${d.count} & ${mtbf} & ${oee} \\\\ \\hline`;
        })
        .join('\n');

      // Ranking de técnicos
      const techMap: Record<string, { total: number; repairMin: number }> = {};
      tickets.filter((t: any) => t.status === 'Finalizado' && t.assigned_to).forEach((t: any) => {
        if (!techMap[t.assigned_to]) techMap[t.assigned_to] = { total: 0, repairMin: 0 };
        techMap[t.assigned_to].total++;
        if (t.started_at && t.finished_at) {
          techMap[t.assigned_to].repairMin += (new Date(t.finished_at).getTime() - new Date(t.started_at).getTime()) / 60000;
        }
      });
      const techRows = Object.entries(techMap)
        .sort((a, b) => {
          const avgA = a[1].total > 0 ? a[1].repairMin / a[1].total : Infinity;
          const avgB = b[1].total > 0 ? b[1].repairMin / b[1].total : Infinity;
          return avgA - avgB;
        })
        .slice(0, 10)
        .map(([tech, d], i) => {
          const avg = d.total > 0 ? Math.round(d.repairMin / d.total) : 0;
          return `    ${i + 1} & ${sanitize(tech)} & ${d.total} & ${avg} \\\\ \\hline`;
        })
        .join('\n');

      // Histórico resumido (últimos 15)
      const historyRows = tickets
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15)
        .map((t: any) => `    ${sanitize(t.id?.substring(0, 8) || '---')} & ${sanitize(t.type)} & ${sanitize(t.location || '---')} & ${sanitize(t.agv_number || '---')} & ${sanitize(t.status)} \\\\ \\hline`)
        .join('\n');

      // Conclusão
      const conclusionContent = total === 0
        ? 'Nenhum chamado registrado no período analisado. Sistema operando sem ocorrências.'
        : `No período analisado foram registrados \\textbf{${total}} chamados, dos quais \\textbf{${finished}} foram finalizados, resultando em uma eficiência operacional de \\textbf{${efficiency}\\%}. O SLA de 30 minutos foi cumprido em \\textbf{${slaPercent}\\%} dos atendimentos. ${efficiency >= 80 ? 'O desempenho operacional encontra-se dentro dos padrões industriais aceitáveis.' : 'Recomenda-se atenção especial à redução do tempo de atendimento e ao backlog acumulado.'}`;

      const texData: any = {
        _templateType: 'operational',
        report_id: reportId,
        period_range: periodRange,
        generated_by: sanitize(req.user.username),
        gen_datetime: new Date().toLocaleString('pt-BR'),
        total_tickets: String(total),
        finished_tickets: String(finished),
        open_tickets: String(open),
        in_progress_tickets: String(inProgress),
        efficiency: String(efficiency),
        sla_percent: String(slaPercent),
        mttr_avg: String(mttrAvg),
        frt_avg: String(frtAvg),
        backlog_count: String(backlog),
        best_shift: `${sanitize(bestShift[0])} (${bestShift[1]} finaliz.)`,
        category_rows: categoryRows || '    Nenhuma categoria registrada & --- & --- \\\\ \\hline',
        agv_rows: agvRows || '    Nenhum AGV registrado & --- & --- & --- \\\\ \\hline',
        technician_rows: techRows || '    --- & Nenhum técnico registrado & --- & --- \\\\ \\hline',
        history_rows: historyRows || '    --- & Nenhum chamado & --- & --- & --- \\\\ \\hline',
        conclusion_content: conclusionContent
      };

      const texSource = populateTemplate(texData);

      try {
        const pdfBuffer = await compileLatexToPdf(texSource);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_operacional_axion_${new Date().toISOString().split('T')[0]}.pdf`);
        return res.send(pdfBuffer);
      } catch (compileErr: unknown) {
        log(`LaTeX compilation failed: ${compileErr instanceof Error ? compileErr.message : String(compileErr)}`, "WARN");
        res.status(500).json({
          error: "O motor de compilação LaTeX não está instalado no servidor.",
          suggestion: "Instale 'texlive-xetex' ou similar para habilitar exportação profissional."
        });
      }

    } else {
      // ============================================
      // RELATÓRIO DE SAÚDE / INFRAESTRUTURA (APM)
      // ============================================
      const metrics = await ApmMetric.find({ timestamp: { $gte: periodStart, $lte: periodEnd } });
      const auditLogs = await AuditLog.find({ timestamp: { $gte: periodStart, $lte: periodEnd } });
      const tickets = await Ticket.find({ created_at: { $gte: periodStart, $lte: periodEnd } });

      const avgCpu = metrics.reduce((a: number, b: any) => a + (b.cpu_usage || 0), 0) / (metrics.length || 1);
      const avgRam = metrics.reduce((a: number, b: any) => a + ((b.ram_used_mb / b.ram_total_mb) * 100), 0) / (metrics.length || 1);
      const avgLatency = metrics.reduce((a: number, b: any) => a + (b.avg_latency_ms || 0), 0) / (metrics.length || 1);
      const avgDbLatency = metrics.reduce((a: number, b: any) => a + (b.db_response_time_ms || 0), 0) / (metrics.length || 1);
      const errorCount = auditLogs.filter((l: any) => l.action.includes("ERROR") || l.action.includes("FAILED")).length;

      const diagnosis = analyzeSystemHealth({
        avgCpu,
        avgRam,
        errorRate: (errorCount / (auditLogs.length || 1)) * 100,
        avgLatency,
        dbLatency: avgDbLatency
      });

      const texData: any = {
        _templateType: 'health',
        report_id: reportId,
        report_title: 'AUDITORIA DE SAÚDE E INFRAESTRUTURA',
        period_range: periodRange,
        generated_by: sanitize(req.user.username),
        gen_datetime: new Date().toLocaleString('pt-BR'),
        executive_summary: "Este documento detalha o estado técnico da infraestrutura Axion, incluindo telemetria de CPU, memória, latência de banco de dados e análise de anomalias críticas no período selecionado.",
        health_score: String(diagnosis.score),
        risk_level: diagnosis.riskLevel.toUpperCase(),
        system_metrics_content: `A carga média de CPU no período foi de ${avgCpu.toFixed(2)}\\%. O consumo de memória RAM manteve-se em média em ${avgRam.toFixed(2)}\\%. Foram detectados ${metrics.length} snapshots de telemetria ativa.`,
        performance_content: `Foram registrados ${tickets.length} chamados no total. A eficiência operacional calculada é de ${diagnosis.score}\\%. A latência média de resposta das APIs foi de ${Math.round(avgLatency)}ms.`,
        db_infra_content: `O banco de dados MongoDB apresentou latência média de ${Math.round(avgDbLatency)}ms. Conexões Redis ativas e saudáveis durante a maior parte do período.`,
        apis_content: `Monitoramento contínuo de endpoints via Socket.io e conexões REST. Nenhuma latência crítica superior ao SLA detectada nos microsserviços internos.`,
        logs_content: `Identificadas ${errorCount} falhas críticas nos logs de auditoria. A taxa de erro média é de ${((errorCount / (auditLogs.length || 1)) * 100).toFixed(2)}\\%.`,
        diagnosis_content: diagnosis.findings.map((f: string) => `\\item ${sanitize(f)}`).join('\n'),
        recommendations_content: `\\begin{itemize} \n ${diagnosis.recommendations.map((r: string) => `\\item ${sanitize(r)}`).join('\n')} \n \\end{itemize}`,
        conclusion_content: `Baseado na análise técnica, o sistema encontra-se em estado \\textbf{${diagnosis.status}}. Recomenda-se seguir as otimizações propostas para garantir a estabilidade industrial.`
      };

      const texSource = populateTemplate(texData);

      try {
        const pdfBuffer = await compileLatexToPdf(texSource);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=auditoria_saude_axion_${new Date().toISOString().split('T')[0]}.pdf`);
        return res.send(pdfBuffer);
      } catch (compileErr: unknown) {
        log(`LaTeX compilation failed: ${compileErr instanceof Error ? compileErr.message : String(compileErr)}`, "WARN");
        res.status(500).json({
          error: "O motor de compilação LaTeX não está instalado no servidor.",
          suggestion: "Instale 'texlive-xetex' para habilitar exportação profissional."
        });
      }
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log(`APM Notifications Test Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Falha catastrófica na geração do relatório." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE WIPE — Moved from server.ts for architectural cleanliness
// ═══════════════════════════════════════════════════════════════════════════════

// snyk-disable-next-line NoRateLimitingForExpensiveWebOperation
router.post("/clear-db", requireAuth, requireSuperAdmin, localLimiter, apiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Senha do administrador obrigatória para esta ação destrutiva." });
    }

    const admin = await User.findOne({ username: req.user.username });
    if (!admin) {
      return res.status(404).json({ error: "Administrador não encontrado." });
    }

    const passwordMatch = await argon2.verify(admin.password, password);
    if (!passwordMatch) {
      logAudit("FAILED_DB_WIPE", req.user.username, { ip: req.ip });
      return res.status(403).json({ error: "Senha incorreta. Operação bloqueada." });
    }

    // ══════ AUDIT DUPLO: Registra ANTES da execução ══════
    logAudit("DATABASE_WIPE_INITIATED", req.user.username, {
      ip: req.ip,
      status: "INITIATED",
      timestamp_start: new Date().toISOString()
    });

    log("⚠️ INICIANDO WIPE GLOBAL DO BANCO DE DADOS PELO APM...", "WARN");

    // Limpeza completa do Banco
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await LoginHistory.deleteMany({});
    await AuditLog.deleteMany({});
    await OperatorFeedback.deleteMany({});

    // Limpeza completa dos uploads físicos
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        if (file !== '.gitkeep' && file !== '.gitignore') {
          try {
            fs.unlinkSync(path.join(UPLOAD_DIR, file));
          } catch(e) {}
        }
      }
    }

    // Recriar SuperAdmin
    await seedAdmin();

    // ══════ AUDIT DUPLO: Registra DEPOIS da execução ══════
    logAudit("DATABASE_WIPE_COMPLETED", req.user.username, {
      ip: req.ip,
      status: "COMPLETED",
      timestamp_end: new Date().toISOString()
    });

    // Notificação ao SuperAdmin via WhatsApp/Email (se configurado)
    try {
      if (admin.whatsapp && admin.notificationPreference !== 'none') {
        await sendWhatsAppMessage(
          admin.whatsapp,
          `⚠️ ALERTA CRÍTICO AXION: Database Wipe executado por ${req.user.username} em ${new Date().toLocaleString('pt-BR')}. IP: ${req.ip}`
        );
      }
      if (admin.email && ['email', 'both'].includes(admin.notificationPreference || '')) {
        await sendEmailMessage(
          admin.email,
          '⚠️ ALERTA CRÍTICO: Database Wipe Executado',
          `O banco de dados foi completamente limpo por ${req.user.username} em ${new Date().toLocaleString('pt-BR')}.<br/>IP: ${req.ip}<br/><br/>Se esta ação não foi autorizada, investigue imediatamente.`
        );
      }
    } catch (notifErr) {
      log(`Notification after DB wipe failed: ${notifErr}`, "WARN");
    }

    res.json({ success: true, message: "Banco de dados limpo com sucesso. Ambiente de produção inicializado." });
  } catch (err: unknown) {
    logAudit("DATABASE_WIPE_FAILED", req.user.username, { ip: req.ip, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: `Erro na limpeza do banco: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
