import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server";
import jwt from "jsonwebtoken";

vi.mock("../config/mongo", () => ({
  connectMongoDB: vi.fn(),
}));

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

vi.mock("argon2", () => ({
  default: { hash: vi.fn(), verify: vi.fn().mockImplementation((hash, plain) => plain === "correct_password") },
  verify: vi.fn().mockImplementation((hash, plain) => plain === "correct_password"),
  hash: vi.fn().mockResolvedValue("hashed_password")
}));

vi.mock("bcryptjs", () => ({
  default: { compareSync: vi.fn() },
  compareSync: vi.fn()
}));

const mockUsers = [
  { 
    id: "admin-user", 
    matricula: "1111111", 
    username: "admin", 
    role: "Admin",
    tokenVersion: 0,
    password: "hashed_password",
    failedLoginAttempts: 0,
    save: vi.fn().mockResolvedValue(true)
  },
  { 
    id: "super-user", 
    matricula: "2222222", 
    username: "super", 
    role: "SuperAdmin",
    tokenVersion: 0,
    password: "hashed_password",
    failedLoginAttempts: 0,
    save: vi.fn().mockResolvedValue(true)
  },
  { 
    id: "standard-user", 
    matricula: "3333333", 
    username: "user", 
    role: "Usuário",
    tokenVersion: 0,
    password: "hashed_password",
    failedLoginAttempts: 0,
    save: vi.fn().mockResolvedValue(true)
  },
  {
    id: "locked-user",
    matricula: "4444444",
    username: "locked",
    role: "Usuário",
    tokenVersion: 0,
    password: "hashed_password",
    failedLoginAttempts: 5,
    lockoutUntil: new Date(Date.now() + 60000), // locked for 1 min
    save: vi.fn().mockResolvedValue(true)
  }
];

vi.mock("../models/mongoose", () => {
  return {
    User: {
      findOne: vi.fn().mockImplementation((query) => {
        // Defesa rigorosa nos mocks
        if (query && (typeof query.matricula === 'object' || typeof query.password === 'object')) {
          return Promise.reject(new Error("Database query error"));
        }
        if (query?.id) return Promise.resolve(mockUsers.find(u => u.id === query.id) || null);
        if (query?.username) return Promise.resolve(mockUsers.find(u => u.username === query.username) || null);
        if (query?.matricula) return Promise.resolve(mockUsers.find(u => u.matricula === query.matricula) || null);
        return Promise.resolve(null);
      }),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => cb([])),
      }),
    },
    AuditLog: { create: vi.fn() },
    LoginHistory: { create: vi.fn() },
  };
});

describe("Auth & Role Middleware API Tests", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret; 
  
  const generateToken = (role: string, id: string) => {
    const u = mockUsers.find(user => user.id === id);
    return jwt.sign({ id, role, username: u ? u.username : "test", tokenVersion: 0 }, secret, { expiresIn: "1h" });
  };

  it("should return system health correctly", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("system");
  });

  describe("POST /api/login", () => {
    it("should reject login without credentials", async () => {
      const res = await request(app).post("/api/login").set("X-Requested-With", "XMLHttpRequest").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Credenciais incompletas");
    });

    it("should reject login with non-existent matricula", async () => {
      const res = await request(app).post("/api/login").set("X-Requested-With", "XMLHttpRequest").send({ matricula: "9999999", password: "123" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Matrícula ou senha inválidos");
    });

    it("should reject login with incorrect password", async () => {
      const res = await request(app).post("/api/login").set("X-Requested-With", "XMLHttpRequest").send({ matricula: "1111111", password: "wrong" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Matrícula ou senha inválidos");
    });

    it("should allow login with correct credentials", async () => {
      const res = await request(app).post("/api/login").set("X-Requested-With", "XMLHttpRequest").send({ matricula: "1111111", password: "correct_password" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("should reject login for locked accounts", async () => {
      const res = await request(app).post("/api/login").set("X-Requested-With", "XMLHttpRequest").send({ matricula: "4444444", password: "correct_password" });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Conta bloqueada/);
    });

    // --- TESTES DE HARDENING E ATAQUES FOCADOS ---
    it("deve bloquear login sem o header CSRF (X-Requested-With)", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ matricula: "1111111", password: "correct_password" });
      
      expect([400, 401, 403]).toContain(res.status);
    });

    it("deve rejeitar ataques de NoSQL Injection avançado no campo de senha", async () => {
      const res = await request(app)
        .post("/api/login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: "1111111", password: { $gt: "" } });
      
      expect(res.status).toBe(400);
    });

    it("deve mitigar ataques de ReDoS (Regular Expression Denial of Service) no input", async () => {
      const evilString = "1".repeat(50000) + "!"; 
      const res = await request(app)
        .post("/api/login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: evilString, password: "123" });
      
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/refresh", () => {
    it("should reject refresh without token", async () => {
      const res = await request(app).post("/api/refresh").set("X-Requested-With", "XMLHttpRequest").send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Refresh token ausente");
    });

    it("should reject refresh with invalid token", async () => {
      const res = await request(app).post("/api/refresh").set("X-Requested-With", "XMLHttpRequest").send({ refreshToken: "invalid.token.here" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Refresh token inválido, adulterado ou expirado");
    });

    it("should allow refresh with valid token", async () => {
      const validRefreshToken = jwt.sign({ id: "admin-user", tokenVersion: 0 }, secret, { expiresIn: "7d" });
      const res = await request(app).post("/api/refresh").set("X-Requested-With", "XMLHttpRequest").send({ refreshToken: validRefreshToken });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");
    });
  });

  describe("RBAC: requireAdmin Middleware", () => {
    it("should reject unauthenticated requests to /api/users", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
    });

    it("should reject Usuário users from accessing /api/users", async () => {
      const token = generateToken("Usuário", "standard-user");
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Acesso restrito a Administradores");
    });

    it("should allow Admin users to access /api/users", async () => {
      const token = generateToken("Admin", "admin-user");
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });

    it("should allow SuperAdmin users to access /api/users", async () => {
      const token = generateToken("SuperAdmin", "super-user");
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });
});
