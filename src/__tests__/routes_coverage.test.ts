import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server";
import jwt from "jsonwebtoken";

/**
 * ============================================================================
 * SUITE DE TESTES — FEEDBACK, APM, AUDIT & INFRAESTRUTURA
 * ============================================================================
 * 
 * Cobre as rotas que eram completamente desprovidas de testes automatizados:
 * - POST /api/feedback (envio de feedback por operadores)
 * - GET /api/feedback (listagem administrativa)
 * - GET /api/login-history (histórico de logins)
 * - POST /api/apm/* (endpoints do SuperAdmin APM)
 * - Validação de CSRF em todas as mutações
 * - Controle de acesso RBAC em rotas administrativas
 */

vi.mock("../config/mongo", () => ({ connectMongoDB: vi.fn() }));
vi.mock("../config/redis", () => ({
  connectRedis: vi.fn(),
  default: {
    isOpen: true,
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setEx: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    flushDb: vi.fn().mockResolvedValue("OK"),
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

vi.mock("../utils/apmTracker", () => ({
  setMaintenanceMode: vi.fn().mockResolvedValue(true),
  getMaintenanceMode: vi.fn().mockReturnValue(false),
  apmMiddleware: vi.fn().mockImplementation((_req: any, _res: any, next: any) => next()),
  recordApiMetrics: vi.fn(),
  getApmMetrics: vi.fn().mockReturnValue({}),
  startMetricsPersistence: vi.fn(),
  isMaintenanceMode: vi.fn().mockResolvedValue(false)
}));

vi.mock("../models/mongoose", () => ({
  User: {
    findOne: vi.fn().mockImplementation((query) => {
      if (query?.username === "superadmin") return Promise.resolve({ id: "usr-sa", username: "superadmin", role: "SuperAdmin", tokenVersion: 0 });
      if (query?.username === "admin") return Promise.resolve({ id: "usr-adm", username: "admin", role: "Admin", tokenVersion: 0 });
      if (query?.username === "operador") return Promise.resolve({ id: "usr-op", username: "operador", role: "Usuário", tokenVersion: 0 });
      return Promise.resolve(null);
    }),
    find: vi.fn().mockResolvedValue([])
  },
  OperatorFeedback: {
    create: vi.fn().mockResolvedValue({ id: "FB-001", matricula: "1234567", name: "João", feedback: "Ótimo!" }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { id: "FB-001", name: "João", feedback: "Ótimo!", created_at: new Date() }
      ])
    })
  },
  AuditLog: {
    create: vi.fn().mockResolvedValue(true),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ id: "LOG-1", action: "LOGIN", username: "admin" }])
    })
  },
  LoginHistory: {
    create: vi.fn().mockResolvedValue(true),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ id: "LH-1", username: "admin", ip: "127.0.0.1" }])
    })
  },
  Ticket: {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockImplementation(() => ({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
      then: vi.fn().mockImplementation((cb) => cb([]))
    })),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ id: "TK-NEW" })
  },
  ApmMetric: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    })
  },
  ApmReport: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    }),
    create: vi.fn().mockResolvedValue({ id: "REP-001", title: "Test Report" })
  }
}));

describe("Feedback, APM, Audit & Infrastructure Routes", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret;

  const superAdminToken = jwt.sign({ id: "usr-sa", role: "SuperAdmin", username: "superadmin", tokenVersion: 0 }, secret, { expiresIn: "1h" });
  const adminToken = jwt.sign({ id: "usr-adm", role: "Admin", username: "admin", tokenVersion: 0 }, secret, { expiresIn: "1h" });
  const operadorToken = jwt.sign({ id: "usr-op", role: "Usuário", username: "operador", tokenVersion: 0 }, secret, { expiresIn: "1h" });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/feedback — Envio de Feedback por Operadores", () => {
    it("deve aceitar feedback com payload válido (matrícula 7 dígitos)", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: "1234567", name: "João Silva", feedback: "Sistema rápido e intuitivo!" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("deve rejeitar feedback com matrícula inválida (< 7 dígitos)", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: "123", name: "João", feedback: "Texto" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/incompletos/i);
    });

    it("deve rejeitar feedback sem nome do operador", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: "1234567", name: "", feedback: "ok" });
      expect(res.status).toBe(400);
    });

    it("deve rejeitar feedback sem texto de feedback", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ matricula: "1234567", name: "X", feedback: "" });
      expect(res.status).toBe(400);
    });

    it("deve rejeitar feedback com payload completamente vazio", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/feedback — Listagem Administrativa", () => {
    it("deve permitir acesso de Admin para listar feedbacks", async () => {
      const res = await request(app)
        .get("/api/feedback")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("deve bloquear acesso de Usuário/Operador à listagem de feedbacks", async () => {
      const res = await request(app)
        .get("/api/feedback")
        .set("Authorization", `Bearer ${operadorToken}`);
      expect(res.status).toBe(403);
    });

    it("deve bloquear acesso sem autenticação", async () => {
      const res = await request(app).get("/api/feedback");
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/login-history — Histórico de Logins", () => {
    it("deve permitir acesso de Admin para consultar histórico de logins", async () => {
      const res = await request(app)
        .get("/api/login-history")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("deve bloquear acesso de Usuário comum ao histórico de logins", async () => {
      const res = await request(app)
        .get("/api/login-history")
        .set("Authorization", `Bearer ${operadorToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/logs — Logs de Auditoria", () => {
    it("deve permitir SuperAdmin acessar logs de auditoria", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("deve bloquear Operador de acessar logs de auditoria", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${operadorToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // APM ROUTES (SuperAdmin Only)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/apm/flush-redis — Flush de Cache (SuperAdmin)", () => {
    it("deve permitir SuperAdmin limpar o cache Redis", async () => {
      const res = await request(app)
        .post("/api/apm/flush-redis")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .set("X-Requested-With", "XMLHttpRequest");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("deve bloquear Admin regular de limpar o cache Redis", async () => {
      const res = await request(app)
        .post("/api/apm/flush-redis")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Requested-With", "XMLHttpRequest");
      expect(res.status).toBe(403);
    });

    it("deve bloquear Operador de limpar o cache Redis", async () => {
      const res = await request(app)
        .post("/api/apm/flush-redis")
        .set("Authorization", `Bearer ${operadorToken}`)
        .set("X-Requested-With", "XMLHttpRequest");
      expect(res.status).toBe(403);
    });

    it("deve bloquear requisição sem header CSRF", async () => {
      const res = await request(app)
        .post("/api/apm/flush-redis")
        .set("Authorization", `Bearer ${superAdminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/apm/maintenance — Toggle de Modo Manutenção (SuperAdmin)", () => {
    it("deve permitir SuperAdmin ativar o modo manutenção", async () => {
      const res = await request(app)
        .post("/api/apm/maintenance")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ enabled: true });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.maintenance).toBe(true);
    });

    it("deve permitir SuperAdmin desativar o modo manutenção", async () => {
      const res = await request(app)
        .post("/api/apm/maintenance")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ enabled: false });
      expect(res.status).toBe(200);
      expect(res.body.maintenance).toBe(false);
    });

    it("deve bloquear Admin regular de alterar modo manutenção", async () => {
      const res = await request(app)
        .post("/api/apm/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ enabled: true });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/apm/reports — Listagem de Relatórios APM", () => {
    it("deve permitir SuperAdmin listar relatórios APM", async () => {
      const res = await request(app)
        .get("/api/apm/reports")
        .set("Authorization", `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
    });

    it("deve bloquear Operador de listar relatórios APM", async () => {
      const res = await request(app)
        .get("/api/apm/reports")
        .set("Authorization", `Bearer ${operadorToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CSRF ENFORCEMENT (Cross-cutting)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("CSRF Enforcement — Validação Global do Header X-Requested-With", () => {
    it("deve bloquear POST /api/tickets sem X-Requested-With", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${operadorToken}`)
        .send({ type: "TI", location: "X" });
      expect(res.status).toBe(403);
    });

    it("deve bloquear PUT /api/users/:id sem X-Requested-With", async () => {
      const res = await request(app)
        .put("/api/users/usr-adm")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ role: "Admin" });
      expect(res.status).toBe(403);
    });

    it("deve permitir GET requests sem X-Requested-With (safe methods)", async () => {
      const res = await request(app)
        .get("/api/health");
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES & HARDENING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Edge Cases e Hardening de Borda", () => {
    it("deve retornar 404 para rotas inexistentes no namespace /api", async () => {
      const res = await request(app)
        .get("/api/rota-inexistente-xyz")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it("deve rejeitar Authorization header com formato malformado", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", "MalformedHeader");
      expect(res.status).toBe(401);
    });

    it("deve rejeitar Authorization header com 'Bearer' mas sem token", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", "Bearer ");
      expect(res.status).toBe(401);
    });

    it("deve rejeitar token JWT expirado", async () => {
      const expiredToken = jwt.sign(
        { id: "usr-sa", role: "SuperAdmin", username: "superadmin", tokenVersion: 0 },
        secret,
        { expiresIn: "-1s" } // Já expirado
      );
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it("deve proteger o health endpoint contra content-type inválido em POST (sem crashar)", async () => {
      const res = await request(app)
        .post("/api/health")
        .set("Content-Type", "text/xml")
        .send("<xml>attack</xml>");
      // Qualquer status que não seja 500 — o servidor não deve crashar
      expect(res.status).not.toBe(500);
    });
  });
});
