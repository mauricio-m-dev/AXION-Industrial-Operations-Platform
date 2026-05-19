import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { Ticket, OperatorFeedback, AuditLog } from '../src/models/mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/Axion";

const LOCATIONS = ["FS-22L", "FS-23R", "WS-01", "WS-02", "QC-LINE", "LOG-AREA", "ASSEMBLY-01", "BODY-SHOP"];
const TYPES = ["AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", "Resíduos"];
const OPERATORS = [
  { name: "João Silva", matricula: "101" },
  { name: "Maria Souza", matricula: "102" },
  { name: "Carlos Ferreira", matricula: "103" }
];
const ADMINS = ["AdminMaster", "Tech_Bruno", "Eng_Ana"];

async function run() {
  try {
    console.log("⏳ Conectando ao banco de dados...");
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado ao MongoDB!");

    // Criar Tickets Finalizados (Para gerar métricas de MTTR e relatórios)
    console.log("📦 Injetando tickets finalizados...");
    for (let i = 0; i < 25; i++) {
      const startDelay = Math.floor(Math.random() * 60) + 5; // 5 a 65 min atrás
      const duration = Math.floor(Math.random() * 45) + 5; // 5 a 50 min de duração
      
      const created_at = new Date(Date.now() - (startDelay + duration + 10) * 60000);
      const started_at = new Date(created_at.getTime() + 5 * 60000); // Demorou 5 min pra iniciar o atendimento
      const finished_at = new Date(started_at.getTime() + duration * 60000);
      
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      const admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];
      
      await Ticket.create({
        id: randomUUID(),
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Finalizado",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: duration > 30 ? "Crítica" : "Média",
        operational_impact: duration > 30 ? "Parada de Linha" : "Nenhum",
        downtime: duration > 30 ? `${duration} min` : "0 min",
        assigned_to: admin,
        created_at,
        started_at,
        finished_at,
        resolution_report: `Atendimento concluído. Substituição de sensores e validação técnica finalizada com sucesso. Tempo total: ${duration} minutos.`,
        observation: "Problema identificado pelo operador durante a passagem de turno."
      });

      await AuditLog.create({
        id: randomUUID(),
        action: "TICKET_CLOSED",
        username: admin,
        details: { ticket_id: op.matricula, resolution: "Resolved" },
        timestamp: finished_at
      });
    }

    // Criar Tickets Em Atendimento
    console.log("🔨 Injetando tickets em andamento...");
    for (let i = 0; i < 6; i++) {
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      const admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];
      const created_at = new Date(Date.now() - 40 * 60000); // 40 min atrás
      const started_at = new Date(Date.now() - 15 * 60000); // Iniciado há 15 min

      await Ticket.create({
        id: randomUUID(),
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Em Atendimento",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: "Alta",
        operational_impact: "Risco de Parada",
        assigned_to: admin,
        created_at,
        started_at,
        observation: "Equipe técnica de prontidão já isolou a área e está diagnosticando o equipamento."
      });
    }

    // Criar Tickets Abertos (Novos/Críticos)
    console.log("🚨 Injetando alertas críticos (abertos)...");
    for (let i = 0; i < 4; i++) {
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      await Ticket.create({
        id: randomUUID(),
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Aberto",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: "Crítica",
        operational_impact: "Parada de Linha",
        created_at: new Date(Date.now() - (Math.floor(Math.random() * 10) * 60000)), // Até 10 min atrás
        observation: "URGENTE: Colisão severa de AGV com estrutura. Linha completamente travada."
      });
    }

    // Injetar Feedbacks
    console.log("💬 Injetando feedbacks...");
    await OperatorFeedback.create([
      { id: randomUUID(), matricula: "101", name: "João Silva", feedback: "Muito ágil relatar problemas por esse app novo!", created_at: new Date() },
      { id: randomUUID(), matricula: "102", name: "Maria Souza", feedback: "Poderiam adicionar uma categoria específica para empilhadeiras.", created_at: new Date(Date.now() - 86400000) },
      { id: randomUUID(), matricula: "103", name: "Carlos Ferreira", feedback: "Hoje o sistema carregou bem rápido, excelente.", created_at: new Date(Date.now() - 4000000) }
    ]);

    console.log("✅ Dados de simulação inseridos com sucesso! O painel Admin vai parecer um ambiente real.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

run();
