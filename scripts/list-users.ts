import mongoose from "mongoose";
import { User } from "../src/models/mongoose";
import "dotenv/config";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Axion");
  const users = await User.find({});
  console.log("USERS IN DATABASE:");
  for (const u of users) {
    console.log({
      username: u.username,
      matricula: u.matricula,
      role: u.role,
      notificationPreference: u.notificationPreference,
      allowedTicketTypes: u.allowedTicketTypes,
      email: u.email,
      whatsapp: u.whatsapp
    });
  }
  process.exit(0);
}

run();
