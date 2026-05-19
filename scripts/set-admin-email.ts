import mongoose from "mongoose";
import { User } from "../src/models/mongoose";
import "dotenv/config";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Axion");
  const admin = await User.findOneAndUpdate(
    { matricula: "0000000" },
    { $set: { email: "axion.technology@gmail.com" } },
    { new: true }
  );
  console.log("Email atualizado:", admin?.email);
  process.exit(0);
}

run();
