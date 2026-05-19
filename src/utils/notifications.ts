import { User } from "../models/mongoose";
import { log } from "./logger";
import { sendDiscordWebhook } from "./webhook";
import { buildUnifiedEmailHtml } from "./templates/email.template";
import nodemailer from "nodemailer";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Strict typing for notification payloads
// ═══════════════════════════════════════════════════════════════════════════════

/** Data passed when a new ticket triggers an alert notification */
export interface TicketNotificationData {
  id: string;
  type: string;
  location: string;
  impact?: string;
  operator_name?: string;
}

/** Data passed when a ticket is finalized with a resolution report */
export interface TicketFinishedData {
  id: string;
  type: string;
  location: string;
  priority?: string;
  operator_name?: string;
  assigned_to?: string;
  created_at?: Date | string;
  finished_at?: Date | string;
  resolution_report?: string;
  finished_by?: string;
}

/** User record shape returned by getNotificationTargetUsers */
interface NotificationTargetUser {
  username: string;
  whatsapp?: string;
  email?: string;
  notificationPreference?: string;
}

// Configuração do Nodemailer (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    let apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const sender = process.env.WHATSAPP_SENDER_NUMBER;

    if (!apiUrl || !sender) {
      log(`[Mock WhatsApp -> ${phone}]: \n${message}`, "INFO");
      return;
    }

    // Garante que a URL tenha o protocolo https://
    if (!apiUrl.startsWith('http')) {
      apiUrl = `https://${apiUrl}`;
    }

    // Formatação de número limpo para Infobip (apenas dígitos)
    const cleanPhone = phone.replace(/\D/g, '');

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `App ${apiKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        from: sender,
        to: cleanPhone,
        content: {
          text: message
        },
        // Compatibilidade com endpoints de broadcast/SMS da Infobip
        messages: [{
          from: sender,
          destinations: [{ to: cleanPhone }],
          text: message
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
    }

    log(`[WhatsApp -> ${phone}]: Mensagem enviada com sucesso via Infobip`, "INFO");
  } catch (error: any) {
    log(`Erro no envio de WhatsApp para ${phone}: ${error.message}`, "ERROR");
  }
}

export async function sendEmailMessage(email: string, subject: string, htmlMessage: string) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      log(`[Mock Email -> ${email} | ${subject}]: \n(Configure as variáveis SMTP para envio real)`, "INFO");
      return;
    }

    const info = await transporter.sendMail({
      from: `"AXION OPs" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: htmlMessage,
    });

    log(`[Email -> ${email}]: Mensagem enviada com sucesso (ID: ${info.messageId})`, "INFO");
  } catch (error: any) {
    log(`Erro no envio de E-mail para ${email}: ${error.message}`, "ERROR");
  }
}



export async function notifyUsersAboutTicket(ticketData: TicketNotificationData, priority: string) {
  try {
    // Disparar alertas para chamados de prioridade Alta, Crítica, OU do tipo Colisão (sempre crítico)
    const isColisao = ticketData.type === "Colisão";
    if (!isColisao && priority !== "Crítico" && priority !== "Alto") {
      return;
    }

    // Carregar dinamicamente todos os usuários autorizados do painel administrativo
    const targetUsers = await getNotificationTargetUsers({ ticketType: ticketData.type });

    const alertLevel = isColisao ? "🚨 ALERTA CRÍTICO — COLISÃO" : "🚨 ALERTA CRÍTICO";
    const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Mensagem com padrão formal, objective e padronizado
    const messageTemplate = `*AXION - CENTRAL DE OPERAÇÕES*
${alertLevel}

Prezado(a) {{USER_NAME}},

${isColisao ? "⚠️ Um chamado de *COLISÃO* foi registrado e classificado automaticamente como CRÍTICO." : "Um chamado crítico foi registrado no sistema e requer ação imediata."}

*Detalhes da Ocorrência:*
• *ID:* ${ticketData.id}
• *Prioridade:* ${priority}
• *Tipo:* ${ticketData.type}
• *Setor/Local:* ${ticketData.location}
• *Impacto:* ${ticketData.impact === "total" ? "Parada Total da Linha" : "Impacto Parcial / Operacional"}
• *Operador Responsável:* ${ticketData.operator_name || "N/A"}
• *Horário da Ocorrência:* ${date}

Por favor, acesse a plataforma AXION imediatamente para realizar a tratativa do chamado.

Atenciosamente,
*Sistema Automatizado AXION*`;

    const emailHtmlTemplate = buildUnifiedEmailHtml({
      title: "AXION - CENTRAL DE OPERAÇÕES",
      subtitle: alertLevel,
      subtitleColor: "#dc2626", // Vermelho Alerta
      description: isColisao 
        ? "Um incidente de <strong>colisão industrial</strong> foi registrado e classificado automaticamente como urgência máxima. O atendimento imediato de um moderador/técnico é requerido para a desobstrução e segurança da via."
        : "Um chamado operacional crítico foi reportado na linha de produção e requer atenção imediata da equipe de gestão.",
      fields: [
        { label: "ID do Chamado", value: ticketData.id },
        { label: "Prioridade", value: priority, isBadge: true, badgeBg: "#fef2f2", badgeColor: "#dc2626" },
        { label: "Tipo do Incidente", value: ticketData.type },
        { label: "Setor / Local", value: ticketData.location },
        { label: "Impacto Operacional", value: ticketData.impact === "total" ? "Parada Total da Linha" : "Parcial / Risco Operacional" },
        { label: "Operador Solicitante", value: ticketData.operator_name || "N/A" },
        { label: "Horário", value: date }
      ]
    });

    // Enviar para todos os usuários autorizados via WhatsApp E Email
    await dispatchNotifications(targetUsers, messageTemplate, `AXION: ${alertLevel} - ${ticketData.id}`, emailHtmlTemplate);

    // Still send to Discord generic webhook
    await sendDiscordWebhook(
      isColisao ? "🚨 COLISÃO — Chamado Crítico Aberto" : "🚨 Chamado Crítico Aberto",
      `**ID:** ${ticketData.id}\n**Tipo:** ${ticketData.type}\n**Local:** ${ticketData.location}\n**Impacto:** ${ticketData.impact}\n**Operador:** ${ticketData.operator_name}`,
      0xEF4444
    );

  } catch (error: any) {
    log(`Notification Dispatch Error: ${error.message}`, "ERROR");
  }
}

/**
 * Notifica todos os gestores/moderadores autorizados sobre a finalização de um chamado,
 * incluindo o relatório de resolução completo. Enviado via WhatsApp e Email.
 */
export async function notifyUsersAboutTicketFinished(ticketData: TicketFinishedData) {
  try {
    const targetUsers = await getNotificationTargetUsers({
      ticketType: ticketData.type,
      isFinishedAlert: true,
      assignedTo: ticketData.assigned_to
    });

    const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const createdAt = ticketData.created_at ? new Date(ticketData.created_at) : null;
    const finishedAt = ticketData.finished_at ? new Date(ticketData.finished_at) : new Date();

    // Calcular MTTR (Mean Time To Repair) em minutos
    let mttrDisplay = "N/A";
    if (createdAt) {
      const diffMs = finishedAt.getTime() - createdAt.getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      if (diffMinutes < 60) {
        mttrDisplay = `${diffMinutes} min`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        mttrDisplay = `${hours}h ${mins}min`;
      }
    }

    const createdAtStr = createdAt
      ? createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "N/A";
    const finishedAtStr = finishedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Truncar relatório para WhatsApp (máximo 500 caracteres)
    const reportTruncated = typeof ticketData.resolution_report === "string"
      ? (ticketData.resolution_report.length > 500
        ? ticketData.resolution_report.substring(0, 500) + "..."
        : ticketData.resolution_report)
      : "N/A";

    const alertLevel = "✅ CHAMADO FINALIZADO";

    const messageTemplate = `*AXION - CENTRAL DE OPERAÇÕES*
${alertLevel}

Prezado(a) {{USER_NAME}},

O chamado abaixo foi finalizado com sucesso.

*Detalhes da Finalização:*
• *ID:* ${ticketData.id}
• *Tipo:* ${ticketData.type}
• *Prioridade:* ${ticketData.priority || "N/A"}
• *Setor/Local:* ${ticketData.location}
• *Operador Solicitante:* ${ticketData.operator_name || "N/A"}
• *Técnico Responsável:* ${ticketData.assigned_to || "N/A"}
• *Finalizado por:* ${ticketData.finished_by || "N/A"}
• *Abertura:* ${createdAtStr}
• *Finalização:* ${finishedAtStr}
• *Tempo de Resolução (MTTR):* ${mttrDisplay}

*Relatório de Finalização:*
${reportTruncated}

Atenciosamente,
*Sistema Automatizado AXION*`;

    const emailHtmlTemplate = buildUnifiedEmailHtml({
      title: "AXION - CENTRAL DE OPERAÇÕES",
      subtitle: alertLevel,
      subtitleColor: "#059669", // Verde Esmeralda
      description: `O chamado número <strong>${ticketData.id}</strong> foi resolvido pela equipe técnica de manutenção e finalizado formalmente com o relatório abaixo anexado para fins de auditoria de processos e cálculo de performance.`,
      fields: [
        { label: "ID do Chamado", value: ticketData.id },
        { label: "Tipo do Incidente", value: ticketData.type },
        { label: "Prioridade Inicial", value: ticketData.priority || "N/A", isBadge: true, badgeBg: ticketData.priority === "Crítico" ? "#fef2f2" : "#f0fdf4", badgeColor: ticketData.priority === "Crítico" ? "#dc2626" : "#15803d" },
        { label: "Setor / Local", value: ticketData.location },
        { label: "Operador Solicitante", value: ticketData.operator_name || "N/A" },
        { label: "Técnico Alocado", value: ticketData.assigned_to || "N/A" },
        { label: "Finalizado por", value: ticketData.finished_by || "N/A" },
        { label: "Data de Abertura", value: createdAtStr },
        { label: "Data de Fechamento", value: finishedAtStr },
        { label: "Tempo de Reparo (MTTR)", value: mttrDisplay, isBadge: true, badgeBg: "#eff6ff", badgeColor: "#DC2626" }
      ],
      highlightBox: {
        title: "📋 Relatório de Resolução Técnica",
        content: ticketData.resolution_report || "N/A",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#065f46"
      }
    });

    // Enviar para todos os usuários autorizados via WhatsApp E Email
    await dispatchNotifications(targetUsers, messageTemplate, `AXION: ${alertLevel} - ${ticketData.id}`, emailHtmlTemplate);

    // Discord webhook
    await sendDiscordWebhook(
      "✅ Chamado Finalizado",
      `**ID:** ${ticketData.id}\n**Tipo:** ${ticketData.type}\n**Técnico:** ${ticketData.assigned_to || "N/A"}\n**MTTR:** ${mttrDisplay}\n**Relatório:** ${reportTruncated}`,
      0x10B981
    );

  } catch (error: any) {
    log(`Finish Notification Dispatch Error: ${error.message}`, "ERROR");
  }
}

interface NotificationOptions {
  ticketType: string;
  isFinishedAlert?: boolean;
  assignedTo?: string;
}

async function getNotificationTargetUsers(options: NotificationOptions): Promise<NotificationTargetUser[]> {
  const registeredUsers = await User.find({
    role: { $ne: "Usuário" },
    notificationPreference: { $ne: "none" }
  });

  // Fallback: se nenhum admin/moderador ativou notificações no sistema, usa destinatário padrão
  if (registeredUsers.length === 0) {
    return [{
      username: "Admin Teste",
      whatsapp: "5511999999999",
      email: process.env.SMTP_USER || "axion.technology@gmail.com",
      notificationPreference: "both"
    } as NotificationTargetUser];
  }

  const targetUsers = registeredUsers.filter((u: any) => {
    if (u.role === "Moderador") {
      const allowed: string[] = u.allowedTicketTypes || [];
      // 1. Deve ser do tipo de chamado permitido para o moderador
      if (!allowed.includes(options.ticketType)) {
        return false;
      }
      
      // 2. Se for alerta de finalizado, ele só recebe se o chamado foi atribuído a ele
      if (options.isFinishedAlert) {
        return Boolean(options.assignedTo && u.username === options.assignedTo);
      }
      
      return true;
    }
    return true; // SuperAdmin e Admin recebem todas
  });

  return targetUsers as unknown as NotificationTargetUser[];
}

/**
 * Despacha notificações para todos os usuários-alvo via WhatsApp E Email.
 * Todos os alertas são enviados para AMBOS canais simultaneamente.
 */
async function dispatchNotifications(
  targetUsers: NotificationTargetUser[],
  whatsappMessage: string,
  emailSubject: string,
  emailHtml: string
): Promise<void> {
  for (const user of targetUsers) {
    const personalizedWhatsapp = whatsappMessage.replace(/\{\{USER_NAME\}\}/g, user.username);
    const personalizedEmail = emailHtml.replace(/\{\{USER_NAME\}\}/g, user.username);

    // WhatsApp — envia para TODOS os usuários que têm número cadastrado
    if (user.whatsapp && user.whatsapp.trim() !== "") {
      await sendWhatsAppMessage(user.whatsapp, personalizedWhatsapp);
    } else {
      log(`Usuário ${user.username}: WhatsApp não cadastrado, enviando apenas por e-mail.`, "WARN");
    }

    // Email — envia para TODOS os usuários que têm email cadastrado
    if (user.email && user.email.trim() !== "") {
      await sendEmailMessage(user.email, emailSubject, personalizedEmail);
    } else {
      log(`Usuário ${user.username}: E-mail não cadastrado, enviando apenas por WhatsApp.`, "WARN");
    }
  }
}
