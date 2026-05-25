import { log } from "./logger";

/**
 * Sends a notification to a Discord webhook.
 * Set the DISCORD_WEBHOOK_URL in your .env file.
 */
export async function sendDiscordWebhook(title: string, description: string, color: number = 0x2563EB) {
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
        timestamp: new Date().toISOString(),
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      log(`Webhook failed with status ${response.status}`, "ERROR");
    }
  } catch (error: any) {
    log(`Webhook Error: ${error.message}`, "ERROR");
  }
}

/**
 * Sends a notification to a WeCom Group Robot webhook.
 */
export async function sendWeComMessage(webhookUrl: string, markdownMessage: string) {
  try {
    const payload = {
      msgtype: "markdown",
      markdown: { content: markdownMessage }
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
    }

    log(`[WeCom]: Mensagem enviada com sucesso`, "INFO");
  } catch (error: any) {
    log(`Erro no envio de WeCom: ${error.message}`, "ERROR");
  }
}
