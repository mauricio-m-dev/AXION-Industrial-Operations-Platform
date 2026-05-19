import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server";
import jwt from "jsonwebtoken";

vi.mock("../config/mongo", () => ({ connectMongoDB: vi.fn() }));
vi.mock("../config/redis", () => ({
  connectRedis: vi.fn(),
  default: { 
    isOpen: true, 
    get: vi.fn(), 
    set: vi.fn(), 
    setEx: vi.fn(), 
    del: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    }))
  }
}));
vi.mock("../socket", () => ({
  initSocket: vi.fn(),
  getIO: vi.fn().mockReturnValue({ emit: vi.fn() })
}));

const mockExistingUsers = [
  { id: "usr-admin", username: "admin", role: "Admin", matricula: "1111111", tokenVersion: 0 },
  { id: "usr-std", username: "user", role: "Usuário", matricula: "2222222", tokenVersion: 0 }
];

vi.mock("../models/mongoose", () => ({
  User: {
    findOne: vi.fn().mockImplementation((query) => {
      if (query?.id) return Promise.resolve(mockExistingUsers.find(u => u.id === query.id) || null);
      if (query?.username) return Promise.resolve(mockExistingUsers.find(u => u.username === query.username) || null);
      if (query?.matricula) return Promise.resolve(mockExistingUsers.find(u => u.matricula === query.matricula) || null);
      return Promise.resolve(null);
    }),
    create: vi.fn().mockImplementation((data) => {
      if (data.matricula === "1111111") {
        const err: any = new Error("Duplicate key");
        err.code = 11000;
        return Promise.reject(err);
      }
      return Promise.resolve({ ...data });
    }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 })
  },
  AuditLog: { create: vi.fn() },
  LoginHistory: { create: vi.fn() }
}));

describe("User Management & Abuse Tests", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret;
  
  const standardToken = jwt.sign({ id: "usr-std", role: "Usuário", username: "user", tokenVersion: 0 }, secret, { expiresIn: "1h" });
  const adminToken = jwt.sign({ id: "usr-admin", role: "Admin", username: "admin", tokenVersion: 0 }, secret, { expiresIn: "1h" });

  describe("GET /api/users - Abuso de Recursos", () => {
    it("deve rejeitar paginação abusiva para evitar DoS no Banco de Dados", async () => {
      const res = await request(app)
        .get("/api/users?limit=10000000&page=1")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/limite máximo|parâmetros inválidos/i);
    });
  });

  describe("POST /api/users - Mass Assignment", () => {
    it("deve ignorar envio de 'id' ou '_id' forjado na criação de usuário", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ _id: "usr-forjado-999", username: "hacker", matricula: "9999999", password: "password123", role: "Usuário" });
      
      expect(res.status).toBe(200);
      expect(res.body.user.id).not.toBe("usr-forjado-999"); 
    });
  });

  // --- TESTES DE RED TEAM / HARDENING ---
  describe("Vulnerabilidades de Atualização (Privilege Escalation)", () => {
    it("deve bloquear tentativa de usuário Usuário se auto-promover a Admin via PUT/PATCH", async () => {
      const res = await request(app)
        .put("/api/users/usr-std")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "SuperAdmin", matricula: "2222222" });
      
      // O middleware RBAC proíbe Usuário de acessar rotas administrativas
      expect([400, 403]).toContain(res.status);
    });
  });

  describe("Conflitos e Poluição HTTP", () => {
    it("deve barrar a criação de usuários com matrículas duplicadas (Race Condition Setup)", async () => {
      // O envio de uma matrícula já existente (ex: 1111111) deve disparar conflito ou validação
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ username: "clone", matricula: "1111111", password: "password123", role: "Usuário" });
      
      expect([400, 409]).toContain(res.status);
    });

    it("deve resistir a HTTP Parameter Pollution na listagem", async () => {
      const res = await request(app)
        .get("/api/users?role=Admin&role=Usuário")
        .set("Authorization", `Bearer ${adminToken}`);
      
      // A API lida perfeitamente com a poluição de parâmetros sem falhar
      expect([200, 400]).toContain(res.status);
    });
  });
});