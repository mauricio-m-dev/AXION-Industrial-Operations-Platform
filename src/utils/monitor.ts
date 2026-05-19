import os from "os";
import mongoose from "mongoose";
import redisClient from "../config/redis";
import { sendWhatsAppMessage, sendEmailMessage } from "./notifications";
import { log } from "./logger";

// Prevenir spam de alertas (Cooldown de 15 minutos por tipo de alerta)
const alertCooldowns: Record<string, number> = {};
const COOLDOWN_MS = 15 * 60 * 1000;

function canSendAlert(alertKey: string): boolean {
  const now = Date.now();
  if (!alertCooldowns[alertKey] || now - alertCooldowns[alertKey] > COOLDOWN_MS) {
    alertCooldowns[alertKey] = now;
    return true;
  }
  return false;
}

export function startSystemMonitor() {
  log("System Monitor Started. Checking health every 60s...", "INFO");

  setInterval(async () => {
    try {
      const dbStatus = mongoose.connection.readyState === 1;
      const redisStatus = redisClient.isOpen;
      
      const cpus = os.cpus();
      const loadAvg = os.loadavg()[0]; // 1 minute load average
      const cpuUsagePercent = (loadAvg / cpus.length) * 100;
      
      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsedPercent = ((memTotal - memFree) / memTotal) * 100;
      
      // Memória do Processo Node.js
      const processMem = process.memoryUsage();
      const heapUsedMB = (processMem.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (processMem.heapTotal / 1024 / 1024).toFixed(2);
      const rssMB = (processMem.rss / 1024 / 1024).toFixed(2);

      const alerts: string[] = [];

      // 1. Checar Banco de Dados
      if (!dbStatus) {
        if (canSendAlert("mongo_down")) {
          alerts.push("⚠️ **ALERTA CRÍTICO:** Conexão com o MongoDB caiu!");
        }
      }

      // 2. Checar Redis
      if (!redisStatus) {
        if (canSendAlert("redis_down")) {
          alerts.push("⚠️ **ALERTA CRÍTICO:** Conexão com o Redis caiu!");
        }
      }

      // 3. Checar CPU (> 80%)
      if (cpuUsagePercent > 80) {
        if (canSendAlert("cpu_high")) {
          alerts.push(`🔥 **ALERTA DE DESEMPENHO:** CPU em estado crítico (${cpuUsagePercent.toFixed(1)}% de uso).`);
        }
      }

      // 4. Checar Memória Ram (> 90%)
      if (memUsedPercent > 90) {
        if (canSendAlert("mem_high")) {
          alerts.push(`🚨 **ALERTA DE MEMÓRIA:** Uso de RAM excedeu 90% (${memUsedPercent.toFixed(1)}%). [Node Heap: ${heapUsedMB}MB / RSS: ${rssMB}MB]`);
        }
      }

      // Enviar alertas acumulados
      if (alerts.length > 0) {
        const message = alerts.join("\n");
        const htmlMessage = alerts.map(a => `<p>${a}</p>`).join("");
        log(`System Monitor Triggered Alerts: ${message}`, "WARN");
        
        const targetPhone = "5571991681355";
        const targetEmail = "axion.technology@gmail.com";
        const emailSubject = "🚨 AXION CRITICAL SYSTEM ALERT";

        // Enviar para WhatsApp
        await sendWhatsAppMessage(targetPhone, `*AXION SYSTEM MONITOR*\n\n${message}`).catch(e => log(`Monitor WhatsApp Error: ${e.message}`, "ERROR"));
        
        // Enviar para E-mail
        await sendEmailMessage(targetEmail, emailSubject, `<h2>AXION SYSTEM MONITOR</h2><div style="color:red; font-weight:bold;">${htmlMessage}</div><p>Acesse o servidor IMEDIATAMENTE para verificar a infraestrutura.</p>`).catch(e => log(`Monitor Email Error: ${e.message}`, "ERROR"));

        // Opcional: Ainda enviar pro Discord se configurado
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: message,
              username: "AXION Health Monitor"
            })
          }).catch(e => log(`Failed to send monitor webhook: ${e.message}`, "ERROR"));
        }
      }
    } catch (error: any) {
      log(`System Monitor Error: ${error.message}`, "ERROR");
    }
  }, 60 * 1000); // 60 segundos
}
