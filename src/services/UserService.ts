import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/mongoose";
import { log } from "../utils/logger";
import redisClient from "../config/redis";

export class UserService {
  private USERS_CACHE_KEY = "api:users:list";

  public async clearCache() {
    try {
      if (redisClient.isOpen) await redisClient.del(this.USERS_CACHE_KEY);
    } catch (err) {
      log(`Redis Cache Clear Error: ${err}`, "ERROR");
    }
  }

  public async createUser(data: any, currentUser: any) {
    const { username, matricula, password, role, email, notificationPreference, allowedTicketTypes } = data;

    if (notificationPreference === 'email') {
      if (!email) throw Object.assign(new Error("E-mail é obrigatório para esta preferência."), { status: 400 });
    }

    const existingByMatricula = await User.findOne({ matricula });
    if (existingByMatricula) {
      throw Object.assign(new Error("Matrícula já está em uso"), { status: 400 });
    }

    const userRole = role || 'Usuário';
    if (userRole === "SuperAdmin" || userRole === "Admin") {
      if (currentUser.role !== "SuperAdmin") {
        throw Object.assign(new Error("Apenas SuperAdmins podem criar novos Administradores ou SuperAdmins"), { status: 403 });
      }
    }

    const hashedPassword = await argon2.hash(password);
    const id = uuidv4();

    await User.create({ 
      id, username, matricula, password: hashedPassword, role: userRole, 
      email, notificationPreference, allowedTicketTypes: allowedTicketTypes || []
    });

    log(`User created: ${username}`);
    await this.clearCache();

    return { id, username, role: userRole, notificationPreference, allowedTicketTypes: allowedTicketTypes || [] };
  }

  public async getUsers() {
    return User.find({}, { _id: 0, id: 1, username: 1, matricula: 1, role: 1, email: 1, notificationPreference: 1, allowedTicketTypes: 1 })
      .sort({ username: 1 })
      .lean();
  }

  public async deleteUser(id: string, currentUser: any) {
    const user = await User.findOne({ id });
    if (!user) throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });

    if (user.role === "SuperAdmin" && currentUser.role !== "SuperAdmin") {
      throw Object.assign(new Error("Você não tem permissão para excluir um SuperAdmin"), { status: 403 });
    }

    if (user.username.toLowerCase() === "axionadmin") {
      throw Object.assign(new Error("Não é possível excluir o administrador padrão"), { status: 400 });
    }

    await User.deleteOne({ id });
    log(`User deleted: ${user.username}`);
    await this.clearCache();
  }

  public async updateUser(id: string, data: any, currentUser: any) {
    const { username, matricula, role, email, notificationPreference, password, allowedTicketTypes } = data;

    const user = await User.findOne({ id });
    if (!user) throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });

    if (user.role === "SuperAdmin" && currentUser.role !== "SuperAdmin") {
      throw Object.assign(new Error("Você não tem permissão para editar um SuperAdmin"), { status: 403 });
    }

    if (role === "SuperAdmin" || role === "Admin") {
      if (currentUser.role !== "SuperAdmin") {
        throw Object.assign(new Error("Apenas SuperAdmins podem conceder o cargo Admin ou SuperAdmin"), { status: 403 });
      }
    }
    
    if (username) user.username = username;

    if (matricula && matricula !== user.matricula) {
      const existingByMatricula = await User.findOne({ matricula });
      if (existingByMatricula) throw Object.assign(new Error("Matrícula já está em uso"), { status: 400 });
      user.matricula = matricula;
    }

    if (role) user.role = role;
    if (email !== undefined) user.email = email;
    if (notificationPreference) user.notificationPreference = notificationPreference;
    if (allowedTicketTypes !== undefined) user.allowedTicketTypes = allowedTicketTypes;
    
    if (password) {
      if (typeof password !== "string" || password.length < 8 || password.length > 64) {
        throw Object.assign(new Error("A senha deve ter no mínimo 8 caracteres"), { status: 400 });
      }
      user.password = await argon2.hash(password);
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    
    log(`User updated: ${user.username}`);
    await this.clearCache();

    return { id: user.id, username: user.username, role: user.role, notificationPreference: user.notificationPreference, allowedTicketTypes: user.allowedTicketTypes };
  }
}

export const userService = new UserService();
