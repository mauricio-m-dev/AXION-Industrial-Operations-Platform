export const recentLogs: { timestamp: string; level: string; message: string }[] = [];

export function log(msg: string, level: "INFO" | "WARN" | "ERROR" = "INFO") {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level}] ${msg}`;
  console.log(formatted);

  if (level === "WARN" || level === "ERROR") {
    recentLogs.push({ timestamp, level, message: msg });
    if (recentLogs.length > 50) {
      recentLogs.shift();
    }
  }
}

