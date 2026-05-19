import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { Ticket, OperatorFeedback, AuditLog } from '../src/models/mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/Axion";

// Dicionários expandidos para gerar gráficos mais variados
const LOCATIONS = [
  "FS-22L", "FS-23R", "WS-01", "WS-02", "QC-LINE", "LOG-AREA", 
  "ASSEMBLY-01", "BODY-SHOP", "PAINT-SHOP", "STAMPING", "WELDING-01",
  "WELDING-02", "INSPECTION-01", "PACKAGING", "MAINTENANCE-BAY"
];

const TYPES = [
  "AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", 
  "Resíduos", "Vazamento Óleo", "Vazamento de Água", "Falha Robô", 
  "Parada CLP", "Atuador Pneumático", "Queda de Tensão", "Falha de Sensor"
];

const OPERATORS = [
  { name: "João Silva", matricula: "101" }, { name: "Maria Souza", matricula: "102" },
  { name: "Carlos Ferreira", matricula: "103" }, { name: "Ana Beatriz", matricula: "104" },
  { name: "Roberto Alves", matricula: "105" }, { name: "Fernanda Costa", matricula: "106" },
  { name: "Lucas Mendes", matricula: "107" }, { name: "Juliana Paes", matricula: "108" },
  { name: "Marcos Rocha", matricula: "109" }, { name: "Patricia Lira", matricula: "111" }
];

const ADMINS = ["AdminMaster", "Tech_Bruno", "Eng_Ana", "Maint_Carlos", "Sup_Marcos", "Eng_Felipe"];

async function run() {
  try {
    console.log("⏳ Conectando ao banco de dados...");
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado ao MongoDB!");

    // Arrays para bulk insert (processamento muito mais rápido)
    const ticketsToInsert = [];
    const auditsToInsert = [];
    const feedbacksToInsert = [];

    // Janela de 30 dias para gerar bons gráficos de linha/tendência
    const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
    const NOW = Date.now();

    // 1. Criar Tickets Finalizados (Volume médio: 500 chamados)
    console.log("📦 Gerando 500 tickets finalizados (Histórico de 30 dias)...");
    for (let i = 0; i < 500; i++) {
      const ticketId = randomUUID();
      
      const randomPastTime = Math.random() * THIRTY_DAYS_IN_MS;
      const created_at = new Date(NOW - randomPastTime);
      
      const responseDelay = Math.floor(Math.random() * 60) + 2; // 2 a 62 min para o técnico iniciar
      const started_at = new Date(created_at.getTime() + responseDelay * 60000);
      
      // Duração concentrada em tempos curtos, mas com eventuais demoras maiores
      const duration = Math.floor(Math.pow(Math.random(), 2) * 240) + 5; 
      const finished_at = new Date(started_at.getTime() + duration * 60000);
      
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      const admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];
      
      let priority = "Baixa";
      if (duration > 90) priority = "Crítica";
      else if (duration > 45) priority = "Alta";
      else if (duration > 20) priority = "Média";

      const impact = priority === "Crítica" ? "Parada de Linha" : (priority === "Alta" ? "Risco de Parada" : "Nenhum");
      
      ticketsToInsert.push({
        id: ticketId,
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Finalizado",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: priority,
        operational_impact: impact,
        downtime: impact === "Parada de Linha" ? `${duration} min` : "0 min",
        assigned_to: admin,
        created_at,
        started_at,
        finished_at,
        resolution_report: `Ação corretiva executada com sucesso. Tempo total de reparo contabilizado: ${duration} min.`,
        observation: duration > 90 ? "Reparo exigiu troca de componente do almoxarifado." : "Ajuste rápido realizado em linha."
      });

      auditsToInsert.push({
        id: randomUUID(),
        action: "TICKET_CLOSED",
        username: admin,
        details: { ticket_id: ticketId, resolution: "Resolved", duration: duration },
        timestamp: finished_at
      });
    }

    // 2. Criar Tickets Em Atendimento
    console.log("🔨 Gerando 20 tickets em andamento...");
    for (let i = 0; i < 20; i++) {
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      const admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];
      
      ticketsToInsert.push({
        id: randomUUID(),
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Em Atendimento",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: Math.random() > 0.6 ? "Alta" : "Média",
        operational_impact: Math.random() > 0.6 ? "Risco de Parada" : "Nenhum",
        assigned_to: admin,
        created_at: new Date(NOW - (Math.random() * 90 + 10) * 60000),
        started_at: new Date(NOW - (Math.random() * 40 + 5) * 60000),
        observation: "Técnico no local realizando diagnóstico elétrico/mecânico."
      });
    }

    // 3. Criar Tickets Abertos
    console.log("🚨 Gerando 10 chamados novos e urgentes...");
    for (let i = 0; i < 10; i++) {
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      ticketsToInsert.push({
        id: randomUUID(),
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        status: "Aberto",
        operator_name: op.name,
        operator_matricula: op.matricula,
        priority: Math.random() > 0.5 ? "Crítica" : "Alta",
        operational_impact: "Parada de Linha",
        created_at: new Date(NOW - (Math.random() * 15) * 60000),
        observation: "Equipamento travou completamente, linha paralisada."
      });
    }

    // 4. Injetar Feedbacks
    console.log("💬 Gerando 75 feedbacks variados...");
    const feedText = [
      "Sistema rápido e prático, não trava.",
      "Gostaria de uma opção para adicionar vídeos e não só fotos.",
      "Melhorou muito o tempo que o técnico demora pra chegar.",
      "A interface noturna ficou muito boa.",
      "Poderia ter um botão de atalho para emergências elétricas.",
      "O app deslogou sozinho ontem.",
      "Excelente atualização, facilitou o preenchimento da OS.",
      "Gostei da nova função de escanear o QR Code da máquina."
    ];
    for (let i = 0; i < 75; i++) {
      const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
      feedbacksToInsert.push({
        id: randomUUID(),
        matricula: op.matricula,
        name: op.name,
        feedback: feedText[Math.floor(Math.random() * feedText.length)],
        created_at: new Date(NOW - (Math.random() * THIRTY_DAYS_IN_MS))
      });
    }

    console.log("🚀 Disparando inserções no MongoDB...");
    
    await Ticket.insertMany(ticketsToInsert);
    await AuditLog.insertMany(auditsToInsert);
    await OperatorFeedback.insertMany(feedbacksToInsert);

    console.log(`✅ SIMULAÇÃO CONCLUÍDA! Banco populado de forma equilibrada.`);
    console.log(`📊 Injetados: ${ticketsToInsert.length} Tickets, ${auditsToInsert.length} Logs, ${feedbacksToInsert.length} Feedbacks.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro durante a injeção:", error);
    process.exit(1);
  }
}

run();