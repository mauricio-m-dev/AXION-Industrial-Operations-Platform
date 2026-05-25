export const recentLogs: { timestamp: string; level: string; message: string }[] = [];

export function log(msg: string, level: "INFO" | "WARN" | "ERROR" = "INFO") {
  const timestamp = new Date().toISOString();
  
  // Structured JSON Log for better APM/Observability compatibility (e.g. ELK, Datadog)
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

