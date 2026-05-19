import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Ticket, OperatorFeedback, AuditLog, LoginHistory } from '../src/models/mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/Axion";

async function runMaintenance() {
  try {
    console.log("⏳ Conectando ao banco de dados para LIMPEZA DE MANUTENÇÃO...");
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado ao MongoDB!");

    console.log("🧹 Apagando TODOS os Tickets...");
    await Ticket.deleteMany({});
    
    console.log("🧹 Apagando TODOS os Feedbacks de Operador...");
    await OperatorFeedback.deleteMany({});
    
    console.log("🧹 Apagando TODOS os Logs de Auditoria...");
    await AuditLog.deleteMany({});

    console.log("🧹 Apagando Histórico de Logins...");
    await LoginHistory.deleteMany({});

    console.log("✅ Banco de dados limpo com sucesso! A plataforma está zerada novamente.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar a manutenção (limpeza):", error);
    process.exit(1);
  }
}

runMaintenance();
