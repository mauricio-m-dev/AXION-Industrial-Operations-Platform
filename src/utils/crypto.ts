import crypto from "node:crypto";
import "dotenv/config";

const IV_LENGTH = 12; // GCM recomenda IV de 12 bytes
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Carrega e valida a chave de criptografia exclusivamente do ambiente.
 */
function loadEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY inválida ou ausente no .env (mínimo 32 caracteres)");
  }
  return Buffer.from(key, "utf-8").subarray(0, 32);
}

/**
 * Criptografa texto usando AES-256-GCM (Autenticação + Criptografia).
 * Formato de saída: iv_hex:authTag_hex:encrypted_hex
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  // Se já estiver criptografado no formato GCM (3 partes), não criptografar de novo
  const parts = text.split(":");
  if (parts.length === 3 && parts[0].length === 24 && parts[1].length === 32) return text;
  
  const keyBuffer = loadEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + authTag + ":" + encrypted;
}

/**
 * Descriptografa texto usando AES-256-GCM.
 * Dados legados sem o formato GCM são retornados como estão.
 */
export function decrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  // Se não estiver no formato criptografado GCM (iv:tag:cipher), retornar como está
  const textParts = text.split(":");
  if (textParts.length !== 3 || textParts[0].length !== 24 || textParts[1].length !== 32) {
    return text;
  }
  
  try {
    const keyBuffer = loadEncryptionKey();
    const iv = Buffer.from(textParts[0], "hex");
    const authTag = Buffer.from(textParts[1], "hex");
    const encryptedText = Buffer.from(textParts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Falha ao descriptografar dado:", error);
    return text; // Fallback para não quebrar a aplicação
  }
}
