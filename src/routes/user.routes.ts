import { Router, Response } from "express";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/mongoose";
import { log } from "../utils/logger";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middleware/auth";
import { userSchema } from "../models/schemas";
import type { AuthenticatedRequest } from "../types/express";

const router = Router();

router.post("/", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos ou senha curta" });
    }
    const { username, matricula, password, role, whatsapp, email, notificationPreference, allowedTicketTypes } = parsed.data;

    // Validate notification preferences
    if (notificationPreference === 'whatsapp' || notificationPreference === 'both') {
      if (!whatsapp) return res.status(400).json({ error: "WhatsApp é obrigatório para esta preferência." });
    }
    if (notificationPreference === 'email' || notificationPreference === 'both') {
      if (!email) return res.status(400).json({ error: "E-mail é obrigatório para esta preferência." });
    }

    const existingByMatricula = await User.findOne({ matricula });
    if (existingByMatricula) {
      return res.status(400).json({ error: "Matrícula já está em uso" });
    }

    const hashedPassword = await argon2.hash(password);
    const id = uuidv4();
    const userRole = role || 'Usuário';

    if (userRole === "SuperAdmin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Apenas SuperAdmins podem criar novos SuperAdmins" });
    }

    await User.create({ 
      id, username, matricula, password: hashedPassword, role: userRole, 
      whatsapp, email, notificationPreference, allowedTicketTypes: allowedTicketTypes || []
    });
    log(`User created: ${username}`);
    res.json({ success: true, user: { id, username, role: userRole, notificationPreference, allowedTicketTypes: allowedTicketTypes || [] } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Create User Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

router.get("/", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 0;
    if (limit > 1000) {
      return res.status(400).json({ error: "Limite máximo de registros excedido. Parâmetros inválidos." });
    }
    const users = await User.find({}, { _id: 0, id: 1, username: 1, matricula: 1, role: 1, whatsapp: 1, email: 1, notificationPreference: 1, allowedTicketTypes: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Fetch Users Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (user.role === "SuperAdmin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Você não tem permissão para excluir um SuperAdmin" });
    }

    if (user.username.toLowerCase() === "axionadmin") {
      return res.status(400).json({ error: "Não é possível excluir o administrador padrão" });
    }

    await User.deleteOne({ id });
    log(`User deleted: ${user.username}`);
    res.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Delete User Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Permitir atualizar qualquer campo enviado, exceto a senha (a menos que providenciada)
    const { username, matricula, role, whatsapp, email, notificationPreference, password, allowedTicketTypes } = req.body;

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (user.role === "SuperAdmin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Você não tem permissão para editar um SuperAdmin" });
    }

    if (role === "SuperAdmin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Apenas SuperAdmins podem conceder o cargo SuperAdmin" });
    }
    
    if (username) user.username = username;

    if (matricula && matricula !== user.matricula) {
      const existingByMatricula = await User.findOne({ matricula });
      if (existingByMatricula) {
        return res.status(400).json({ error: "Matrícula já está em uso" });
      }
      user.matricula = matricula;
    }

    if (role) user.role = role;
    if (whatsapp !== undefined) user.whatsapp = whatsapp;
    if (email !== undefined) user.email = email;
    if (notificationPreference) user.notificationPreference = notificationPreference;
    if (allowedTicketTypes !== undefined) user.allowedTicketTypes = allowedTicketTypes;
    
    if (typeof password === "string" && password.length >= 6) {
      user.password = await argon2.hash(password);
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    log(`User updated: ${user.username}`);
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, notificationPreference: user.notificationPreference, allowedTicketTypes: user.allowedTicketTypes } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Update User Error: ${errMsg}`, "ERROR");
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

export default router;
