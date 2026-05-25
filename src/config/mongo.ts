import mongoose from "mongoose";
import { log } from "../utils/logger";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { User } from "@/src/models/mongoose.ts";

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/Axion";
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 20, // Mantém até 20 conexões ativas no pool (Performance)
      minPoolSize: 5, // Mantém mínimo de 5 conexões preparadas
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    log("Connected to MongoDB successfully (Pool Configured)");
    await seedAdmin();
    await migrateRoles();
  } catch (error) {
    log(`MongoDB connection error: ${error}`, "ERROR");
    setTimeout(connectMongoDB, 5000); // Retry connection
  }
}

async function migrateRoles() {
  try {
    const resManu = await User.updateMany({ role: "Manutencista" }, { $set: { role: "Moderador" } });
    if (resManu.modifiedCount > 0) {
      log(`Migrated ${resManu.modifiedCount} users from Manutencista to Moderador`);
    }
    const resStd = await User.updateMany({ role: "Standard" }, { $set: { role: "Usuário" } });
    if (resStd.modifiedCount > 0) {
      log(`Migrated ${resStd.modifiedCount} users from Standard to Usuário`);
    }

    // Garante que Moderadores existentes recebam as permissões padrões de chamados para não perderem acesso
    const defaultTypes = ["AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", "Resíduos", "Erro de Software", "Bateria Fraca"];
    await User.updateMany(
      { role: "Moderador", $or: [{ allowedTicketTypes: { $exists: false } }, { allowedTicketTypes: { $size: 0 } }] },
      { $set: { allowedTicketTypes: defaultTypes } }
    );
  } catch (err: any) {
    log(`Role migration error: ${err.message}`, "ERROR");
  }
}

export async function seedAdmin() {
  try {
    // Busca agressiva por qualquer conta administrativa existente para conversão
    let admin = await User.findOne({ 
      $or: [
        { matricula: "0000000" },
        { username: { $regex: /^admin$/i } },
        { role: "SuperAdmin" }
      ]
    });
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminUsername = process.env.SEED_ADMIN_USERNAME;
    if (!seedPassword || !adminUsername) {
      log("SEED_ADMIN_PASSWORD ou SEED_ADMIN_USERNAME não definidas no .env. Seed do admin ignorada.", "WARN");
      return;
    }
    const hashedPassword = await argon2.hash(seedPassword);

    if (admin) {
      log("Admin user found by matricula. Checking if credentials need update...");
      let needsUpdate = false;

      if (admin.username !== adminUsername) {
        admin.username = adminUsername;
        needsUpdate = true;
      }

      // Evita re-hashear a senha se ela já for compatível com a do .env
      const passwordMatches = await argon2.verify(admin.password, seedPassword).catch(() => false);
      if (!passwordMatches) {
        admin.password = hashedPassword;
        admin.tokenVersion = (admin.tokenVersion || 0) + 1; // Apenas força logout se a senha realmente mudou
        needsUpdate = true;
      }

      if (admin.role !== "SuperAdmin") {
        admin.role = "SuperAdmin";
        needsUpdate = true;
      }

      if (admin.notificationPreference !== "email") {
        admin.notificationPreference = "email";
        needsUpdate = true;
      }

      if (needsUpdate) {
        await admin.save();
        log("Admin credentials updated in database.");
      } else {
        log("Admin credentials are up to date. Skipping update.");
      }
    } else {
      log("Seeding default admin user...");
      await User.create({
        id: uuidv4(),
        username: adminUsername,
        matricula: "0000000",
        password: hashedPassword,
        role: "SuperAdmin",
        notificationPreference: "email"
      });
      log("Admin user created successfully.");
    }
  } catch (err: any) {
    log(`Seed error: ${err.message}`, "ERROR");
  }
}
