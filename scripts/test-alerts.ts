import dotenv from "dotenv";
dotenv.config();

import { User } from "../src/models/mongoose";

// Mock do Mongoose User.find para não precisar de banco de dados rodando localmente
User.find = (async (query?: any) => {
  console.log("🔍 [Mock User.find] Retornando usuário Maurício Silva para notificações");
  return [{
    id: "test-user-mauricio",
    username: "Maurício Silva",
    matricula: "8888888",
    password: process.env.TEST_USER_PASSWORD || "",
    role: "SuperAdmin",
    email: "mauricio.m.silv4@gmail.com",
    whatsapp: "5511999999999", // Número de teste
    notificationPreference: "both",
    allowedTicketTypes: ["Colisão", "AGV com falha", "Falta de peças", "Painel/Botoeira"]
  } as any];
}) as any;

import { notifyUsersAboutTicket, notifyUsersAboutTicketFinished } from "../src/utils/notifications";

async function runTest() {
  try {
    console.log("🚀 Iniciando teste offline de notificações (Bypass MongoDB ativo)...");

    // 1. Simular Abertura de Chamado de Colisão (Sempre Crítico)
    console.log("\n🚨 Testando abertura de chamado de COLISÃO...");
    const collisionTicketData = {
      id: "TK-COLLISION-TEST",
      type: "Colisão",
      location: "BODY-SHOP",
      impact: "total",
      operator_name: "Operador João"
    };

    console.log("Simulando envio de notificação de abertura...");
    await notifyUsersAboutTicket(collisionTicketData, "Crítico");
    console.log("✅ Alerta de abertura de colisão disparado com sucesso!");

    // 2. Simular Finalização de Chamado com Relatório
    console.log("\n✅ Testando finalização de chamado com Relatório...");
    const finishedTicketData = {
      id: "TK-FINISH-TEST",
      type: "AGV com falha",
      location: "ASSEMBLY-01",
      priority: "Crítico",
      operator_name: "Operador Maria",
      assigned_to: "Tech_Bruno",
      created_at: new Date(Date.now() - 45 * 60000), // Aberto há 45 minutos (MTTR de 45 min)
      finished_at: new Date(),
      resolution_report: "Identificada falha de comunicação na placa lógica principal do AGV-04. Foi realizada a substituição preventiva dos sensores de proximidade ultrassônicos e feito o reset geral do firmware de controle. O AGV foi testado em pista e retornou ao fluxo operacional sem novas anomalias de frenagem.",
      finished_by: "Tech_Bruno"
    };

    console.log("Simulando envio de notificação de finalização...");
    await notifyUsersAboutTicketFinished(finishedTicketData);
    console.log("✅ Alerta de finalização de chamado disparado com sucesso!");

    console.log("\n🎉 Todos os testes disparados com sucesso via SMTP real para mauricio.m.silv4@gmail.com!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro durante a execução dos testes:", error);
    process.exit(1);
  }
}

runTest();
