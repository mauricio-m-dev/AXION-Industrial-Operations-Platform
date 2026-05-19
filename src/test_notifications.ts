import mongoose from "mongoose";
import { User } from "./models/mongoose.js";
import "dotenv/config";

async function getNotificationTargetUsers(options: any): Promise<any[]> {
  const registeredUsers = await User.find({
    role: { $ne: "Usuário" },
    notificationPreference: { $ne: "none" }
  });

  if (registeredUsers.length === 0) {
    return [{
      username: "Admin Teste",
      whatsapp: "5511999999999",
      email: process.env.SMTP_USER || "axion.technology@gmail.com",
      notificationPreference: "both"
    }];
  }

  const targetUsers = registeredUsers.filter((u: any) => {
    if (u.role === "Moderador") {
      const allowed: string[] = u.allowedTicketTypes || [];
      if (!allowed.includes(options.ticketType)) {
        return false;
      }
      if (options.isFinishedAlert && options.assignedTo) {
        return u.username === options.assignedTo;
      }
      return true;
    }
    return true; // SuperAdmin e Admin recebem todas
  });

  return targetUsers;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://mongo:27017/Axion");
  
  const options = { ticketType: "Colisão" };
  const targets = await getNotificationTargetUsers(options);
  
  console.log("TARGETS FOR COLISAO:", targets.map(u => u.username));
  process.exit(0);
}

run();
