import { AuditLog } from "../models/mongoose";
import { v4 as uuidv4 } from "uuid";
import { log } from "./logger";

export async function logAudit(action: string, username: string, details: Record<string, unknown> = {}) {
  try {
    await AuditLog.create({
      id: uuidv4(),
      action,
      username,
      details
    });
  } catch (err) {
    log(`Failed to log audit: ${err}`, "ERROR");
  }
}
