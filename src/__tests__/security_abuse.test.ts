import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server";
import jwt from "jsonwebtoken";

// Defesa e Mocking Integrado de Alta Fidelidade Server-Side
vi.mock("../config/mongo", () => ({ connectMongoDB: vi.fn() }));
vi.mock("../config/redis", () => ({
  connectRedis: vi.fn(),
  default: {
    isOpen: true,
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setEx: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    connect: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    }))
  }
}));

const mockUsersDb: Record<string, any> = {
  "mod-mecanica": {
    id: "usr-mod-1",
    username: "mod-mecanica",
    role: "Moderador",
    allowedTicketTypes: ["Mecânica", "Operacional"],
    tokenVersion: 2
  },
  "std-user": {
    id: "usr-std-1",
    username: "std-user",
    role: "Usuário",
    allowedTicketTypes: [],
    tokenVersion: 1
  },
  "admin-master": {
    id: "usr-adm-1",
    username: "admin-master",
    role: "SuperAdmin",
    allowedTicketTypes: [],
    tokenVersion: 1
  }
};

const mockTicketsDb: Record<string, any> = {
  "TK-TI-999": {
    id: "TK-TI-999",
    type: "TI",
    location: "SALA-SERVIDORES",
    status: "Aberto",
    priority: "Crítico"
  },
  "TK-MEC-111": {
    id: "TK-MEC-111",
    type: "Mecânica",
    location: "LINHA-EIXOS",
    status: "Aberto",
    priority: "Alto"
  }
};

vi.mock("../models/mongoose", () => {
  return {
    User: {
      findOne: vi.fn().mockImplementation((query) => {
        if (query?.username) {
          return Promise.resolve(mockUsersDb[query.username] || null);
        }
        if (query?.id) {
          const found = Object.values(mockUsersDb).find(u => u.id === query.id);
          return Promise.resolve(found || null);
        }
        return Promise.resolve(null);
      })
    },
    Ticket: {
      findOne: vi.fn().mockImplementation((query) => {
        if (query?.id) return Promise.resolve(mockTicketsDb[query.id] || null);
        return Promise.resolve(null);
      }),
      find: vi.fn().mockImplementation(() => {
        return {
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([]),
          then: vi.fn().mockImplementation((cb) => cb(Object.values(mockTicketsDb)))
        };
      }),
      countDocuments: vi.fn().mockResolvedValue(2),
      aggregate: vi.fn().mockResolvedValue([]),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 })
    },
    AuditLog: { create: vi.fn().mockResolvedValue(true) },
    LoginHistory: { create: vi.fn().mockResolvedValue(true) }
  };
});

describe("Masterclass Security & Authorization Abuse Validation Suite", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret;

  // Geração de tokens autênticos
  const tokenModMecanica = jwt.sign({ id: "usr-mod-1", username: "mod-mecanica", role: "Moderador", tokenVersion: 2 }, secret, { expiresIn: "1h" });
  const tokenBaseUser = jwt.sign({ id: "usr-std-1", username: "std-user", role: "Usuário", tokenVersion: 1 }, secret, { expiresIn: "1h" });
  const tokenAdmin = jwt.sign({ id: "usr-adm-1", username: "admin-master", role: "SuperAdmin", tokenVersion: 1 }, secret, { expiresIn: "1h" });

  describe("1. Defesa Contra JWT Tampering e Algorithm Stripping", () => {
    it("deve rejeitar token assinado com algoritmo None (JWT None Attack)", async () => {
      // Forjamos manualmente um token sem assinatura usando alg: none
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ id: "usr-adm-1", username: "admin-master", role: "SuperAdmin" })).toString("base64url");
      const noneToken = `${header}.${payload}.`;

      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${noneToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inválido|adulterado|negado/i);
    });

    it("deve rejeitar tokens assinados com segredos forjados (Adulteração de Assinatura)", async () => {
      const forgedToken = jwt.sign({ id: "usr-adm-1", username: "admin-master", role: "SuperAdmin" }, "fake_attacker_secret");

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it("deve rejeitar tokens com payload modificado tentando escalar privilégio localmente", async () => {
      // O atacante pega um token autêntico de Usuário e altera o trecho do payload para role: SuperAdmin
      const parts = tokenBaseUser.split(".");
      const forgedPayload = Buffer.from(JSON.stringify({ id: "usr-std-1", username: "std-user", role: "SuperAdmin", tokenVersion: 1 })).toString("base64url");
      const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe("2. Validação Server-Side Ativa e tokenVersion (Invalidação Instantânea)", () => {
    it("deve revogar acesso imediatamente se o tokenVersion do JWT divergir do banco de dados", async () => {
      // Emitimos um token autêntico, mas com tokenVersion defasado (ex: 1, enquanto o banco possui 2)
      const staleToken = jwt.sign({ id: "usr-mod-1", username: "mod-mecanica", role: "Moderador", tokenVersion: 1 }, secret, { expiresIn: "1h" });

      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${staleToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/expirada ou revogada/i);
    });

    it("deve revogar acesso se o usuário for deletado ou inexistente no banco server-side", async () => {
      const ghostToken = jwt.sign({ id: "ghost-id", username: "ghost-user", role: "Admin", tokenVersion: 1 }, secret);

      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${ghostToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inexistente ou desativada/i);
    });
  });

  describe("3. Proteção Contra IDOR e Isolamento RBAC de Moderadores", () => {
    it("deve impedir com erro 403 que um Moderador interaja com chamados de categorias proibidas", async () => {
      // mod-mecanica possui acesso apenas a Mecânica/Operacional. Tenta fechar um chamado de TI (TK-TI-999).
      const res = await request(app)
        .patch("/api/tickets/TK-TI-999/status")
        .set("Authorization", `Bearer ${tokenModMecanica}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "Em atendimento" });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso negado: Tipo de chamado não permitido/i);
    });

    it("deve autorizar que o Moderador interaja com chamados contidos no seu escopo de categoria", async () => {
      // Interagindo com TK-MEC-111 (categoria Mecânica autorizada)
      const res = await request(app)
        .patch("/api/tickets/TK-MEC-111/status")
        .set("Authorization", `Bearer ${tokenModMecanica}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "Em atendimento" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("4. Isolamento Estrito de APIs Administrativas e Acesso Vertical/Horizontal", () => {
    it("deve bloquear usuários base de acessarem endpoints administrativos ou listagem de logs", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${tokenBaseUser}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso restrito/i);
    });

    it("deve proibir tentativas de injeção de privilégios ou alteração manual de permissões por Moderadores", async () => {
      // Um Moderador tenta forçar via PUT /api/users a atribuição de role SuperAdmin para si mesmo
      const res = await request(app)
        .put("/api/users/usr-mod-1")
        .set("Authorization", `Bearer ${tokenModMecanica}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "SuperAdmin", allowedTicketTypes: ["ALL"] });

      // O middleware requireAdmin barra contas Moderador e Usuário direto na borda
      expect(res.status).toBe(403);
    });
  });

  describe("5. Fallback Seguro e Proteção de Integração de Cookies HttpOnly", () => {
    it("deve extrair e validar perfeitamente o token injetado via Cookie HttpOnly na ausência do Bearer", async () => {
      // Simulando o tráfego do token via cabeçalho Cookie nativo
      const res = await request(app)
        .get("/api/tickets/stats")
        .set("Cookie", [`access_token=${tokenModMecanica}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("total");
    });
  });
});
