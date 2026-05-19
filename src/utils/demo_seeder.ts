import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { User, Ticket, AuditLog, LoginHistory, OperatorFeedback } from "../models/mongoose";
import { connectMongoDB } from "../config/mongo";
import argon2 from "argon2";
import "dotenv/config";

const LOCATIONS = ["ASSEMBLY-01", "BODY-SHOP", "QC-LINE", "FS-22L", "FS-23R", "LOGISTICS-A", "PAINT-SHOP"];
const TYPES = ["AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", "Erro de Software", "Bateria Fraca"];
const OPERATORS = [
  { name: "João Silva", matricula: "OP1001" },
  { name: "Maria Santos", matricula: "OP1002" },
  { name: "Carlos Souza", matricula: "OP1003" },
  { name: "Ana Oliveira", matricula: "OP1004" }
];
const ADMINS = ["admin", "byd"];

async function runSeeder() {
  console.log("🚀 Iniciando Limpeza e Injeção de Dados Demo...");
  
  await connectMongoDB();

  // 1. LIMPEZA
  console.log("🧹 Limpando coleções operacionais...");
  await Ticket.deleteMany({});
  await AuditLog.deleteMany({});
  await LoginHistory.deleteMany({});
  await OperatorFeedback.deleteMany({});
  // Não deletamos Users, mas vamos garantir que os operadores de teste existam
  
  // 2. GARANTIR OPERADORES DE TESTE
  console.log("👤 Configurando usuários de demonstração...");
  const hashedPassword = await argon2.hash("demo123");
  for (const op of OPERATORS) {
    await User.findOneAndUpdate(
      { matricula: op.matricula },
      { 
        id: uuidv4(),
        username: op.name,
        matricula: op.matricula,
        password: hashedPassword,
        role: "Usuário"
      },
      { upsert: true }
    );
  }

  // 3. INJEÇÃO DE TICKETS (Últimos 30 dias)
  console.log("🎫 Gerando 150+ tickets realistas...");
  const now = new Date();
  
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 24 * 60 * 60 * 1000));
    
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const typeRoll = Math.random();
    let type = TYPES[0]; // AGV com falha (Default)
    if (typeRoll < 0.40) type = "AGV com falha";
    else if (typeRoll < 0.65) type = "Bateria Fraca";
    else if (typeRoll < 0.80) type = "Falta de peças";
    else if (typeRoll < 0.90) type = "Painel/Botoeira";
    else if (typeRoll < 0.97) type = "Erro de Software";
    else type = "Colisão";
    const operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    
    let status = "Finalizado";
    if (daysAgo < 2) status = Math.random() > 0.5 ? "Aberto" : "Em atendimento";
    if (daysAgo >= 2 && daysAgo < 5 && Math.random() > 0.8) status = "Em atendimento"; // Alguns atrasados

    let priority = "Médio";
    if (["ASSEMBLY-01", "BODY-SHOP"].includes(location)) priority = Math.random() > 0.5 ? "Crítico" : "Alto";
    if (type === "Colisão") priority = "Crítico";

    const ticketId = `TK-${1000 + i}`;
    
    // Datas de atendimento
    const startedAt = status !== "Aberto" ? new Date(date.getTime() + (Math.random() * 60 * 60 * 1000)) : undefined;
    const finishedAt = status === "Finalizado" ? new Date((startedAt?.getTime() || date.getTime()) + (Math.random() * 4 * 60 * 60 * 1000)) : undefined;

    await Ticket.create({
      id: ticketId,
      type,
      location,
      agv_number: Math.floor(Math.random() * 50).toString(),
      observation: `Simulação de ocorrência em ${location} durante o turno operacional.`,
      status,
      priority,
      operator_name: operator.name,
      operator_matricula: operator.matricula,
      operational_impact: priority === "Crítico" ? "total" : "partial",
      downtime: priority === "Crítico" ? "now" : "15m",
      created_at: date,
      updated_at: finishedAt || startedAt || date,
      started_at: startedAt,
      finished_at: finishedAt,
      assigned_to: status !== "Aberto" ? ADMINS[Math.floor(Math.random() * ADMINS.length)] : undefined,
      resolution_report: status === "Finalizado" ? "Manutenção preventiva realizada, sensores recalibrados e AGV testado em linha." : undefined
    });

    // 4. LOGS DE AUDITORIA SINCRO
    await AuditLog.create({
      id: uuidv4(),
      action: "OPEN_TICKET",
      username: operator.name,
      details: { ticketId, type, location },
      timestamp: date
    });

    if (status === "Finalizado") {
      await AuditLog.create({
        id: uuidv4(),
        action: "FINISH_TICKET",
        username: "admin",
        details: { ticketId, resolution: "Resolvido" },
        timestamp: finishedAt
      });
    }
  }

  // 5. LOGIN HISTORY
  console.log("🔑 Gerando histórico de acessos...");
  for (let i = 0; i < 50; i++) {
    const user = [...OPERATORS.map(o => o.name), ...ADMINS][Math.floor(Math.random() * 6)];
    await LoginHistory.create({
      id: uuidv4(),
      username: user,
      ip_address: `192.168.1.${Math.floor(Math.random() * 254)}`,
      device: Math.random() > 0.5 ? "Mobile (Zebra Scanner)" : "Desktop (Control Room)",
      timestamp: new Date(now.getTime() - (Math.random() * 7 * 24 * 60 * 60 * 1000))
    });
  }

  // 6. FEEDBACKS
  console.log("💬 Injetando feedbacks...");
  const feedbacks = [
    "Sistema muito rápido para abrir chamados.",
    "A interface no coletor de dados está excelente.",
    "Sugestão: adicionar mapa de calor de falhas por AGV.",
    "O tempo de resposta da manutenção melhorou muito após o AXION."
  ];
  for (let i = 0; i < 10; i++) {
    const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    await OperatorFeedback.create({
      id: uuidv4(),
      name: op.name,
      matricula: op.matricula,
      feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
      created_at: new Date(now.getTime() - (Math.random() * 15 * 24 * 60 * 60 * 1000))
    });
  }

  console.log("\n✅ AMBIENTE DE DEMO PRONTO!");
  console.log(`📊 Tickets: 150 | Logs: 300+ | Usuários Demo: 4`);
  process.exit(0);
}

runSeeder().catch(err => {
  console.error("❌ Erro no Seeder:", err);
  process.exit(1);
});
