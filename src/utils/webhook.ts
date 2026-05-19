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
    });

    if (!response.ok) {
      log(`Webhook failed with status ${response.status}`, "ERROR");
    }
  } catch (error: any) {
    log(`Webhook Error: ${error.message}`, "ERROR");
  }
}
