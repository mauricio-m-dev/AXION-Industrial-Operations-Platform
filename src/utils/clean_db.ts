import { Ticket, AuditLog, LoginHistory, OperatorFeedback, User } from "../models/mongoose";
import { connectMongoDB } from "../config/mongo";
import "dotenv/config";

async function cleanSystem() {
  console.log("🧹 Iniciando limpeza profunda do sistema AXION...");
  
  await connectMongoDB();

  console.log("- Removendo Chamados...");
  await Ticket.deleteMany({});
  
  console.log("- Removendo Logs de Auditoria...");
  await AuditLog.deleteMany({});
  
  console.log("- Removendo Histórico de Login...");
  await LoginHistory.deleteMany({});
  
  console.log("- Removendo Feedbacks...");
  await OperatorFeedback.deleteMany({});
  
  console.log("- Removendo Usuários (Exceto Admin)...");
  await User.deleteMany({ matricula: { $ne: "admin" } });

  console.log("\n✨ SISTEMA LIMPO E EM ESTADO INICIAL!");
  console.log("Apenas o SuperAdmin ('admin') foi preservado.");
  process.exit(0);
}

cleanSystem().catch(err => {
  console.error("❌ Erro na limpeza:", err);
  process.exit(1);
});
