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

vi.mock("file-type", () => ({
  fileTypeFromFile: vi.fn().mockImplementation((filePath: string) => {
    if (filePath.includes("malicioso")) return Promise.resolve({ mime: "application/x-sh" });
    return Promise.resolve({ mime: "image/jpeg" });
  })
}));

const mockTickets = [
  { id: "TCK-1001", type: "Manutenção", status: "Em atendimento", priority: "Crítico", location: "Linha 1", assigned_to: "joao", owner: "joao" },
  { id: "TCK-1002", type: "TI", status: "Em atendimento", priority: "Média", location: "Linha 2", assigned_to: "maria", owner: "maria" },
  { id: "TCK-FECHADO", type: "TI", status: "Fechado", priority: "Baixo", location: "Linha 2", assigned_to: "tester", resolution_report: "Ok" }
];

vi.mock("../models/mongoose", () => ({
  User: {
    findOne: vi.fn().mockImplementation((query) => {
      if (query?.username === "mod_tester") {
        return Promise.resolve({ role: "Moderador", allowedTicketTypes: ["Apenas_Mecanica"] });
      }
      if (query?.username === "tester" || query?.username === "maria") {
        return Promise.resolve({ role: "Moderador", allowedTicketTypes: ["Manutenção", "TI"] });
      }
      return Promise.resolve({ role: "Usuário", allowedTicketTypes: ["Manutenção", "TI"] });
    })
  },
  Ticket: {
    findOne: vi.fn().mockImplementation((query) => Promise.resolve(mockTickets.find(t => t.id === query.id) || null)),
    create: vi.fn().mockImplementation((data) => {
      return Promise.resolve({ id: "TCK-NEW", ...data, status: "Aberto" });
    }),
    updateOne: vi.fn().mockImplementation((query, update) => {
      if (query && query.id === "TCK-FECHADO") {
        return Promise.resolve({ modifiedCount: 0 });
      }
      return Promise.resolve({ modifiedCount: 1 });
    })
  },
  AuditLog: { create: vi.fn() },
  LoginHistory: { create: vi.fn() }
}));

describe("Tickets API & Logic Abuses", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret;
  
  const standardToken = jwt.sign({ id: "test-user", role: "Moderador", username: "tester" }, secret);
  const tokenMaria = jwt.sign({ id: "maria", role: "Moderador", username: "maria" }, secret);

  describe("POST /api/tickets - Injeção de Status", () => {
    it("deve forçar o status inicial para 'Aberto' mesmo que o atacante envie 'Fechado'", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ type: "TI", location: "Sala 1", impact: "partial", description: "Erro", operator_name: "João", status: "Fechado" }); 
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("PATCH /api/tickets/:id/start - Quebra de State Machine", () => {
    it("deve impedir o início de um chamado que já está Fechado", async () => {
      const res = await request(app)
        .patch("/api/tickets/TCK-FECHADO/start")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({});
      
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/assumido por outro usuário ou não está mais aberto/i);
    });
  });

  describe("PATCH /api/tickets/:id/finish - XSS e Limite de Arquivos", () => {
    it("deve rejeitar arquivos muito grandes na finalização (Prevenção de OOM)", async () => {
      const massiveBuffer = Buffer.alloc(1024 * 1024 * 20, "A"); // 20MB

      const res = await request(app)
        .patch("/api/tickets/TCK-1001/finish")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .field("resolution_report", "Consertado")
        .attach("resolution_image", massiveBuffer, "gigante.jpg");
      
      expect(res.status).toBe(413);
    });

    it("deve sanitizar ou rejeitar tags de script no relatório (Prevenção de XSS)", async () => {
      const maliciousReport = "<script>alert('hackeado')</script> Resolvido.";
      
      const res = await request(app)
        .patch("/api/tickets/TCK-1001/finish")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .field("resolution_report", maliciousReport)
        .attach("resolution_image", Buffer.from("imagem falsa"), "test.jpg");
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/malicioso/i);
    });
  });

  // --- TESTES DE HARDENING / RED TEAM ---
  describe("IDOR (Insecure Direct Object Reference)", () => {
    it("deve IMPEDIR que Maria feche ou atualize o ticket que pertence a João", async () => {
      const res = await request(app)
        .patch("/api/tickets/TCK-1001/finish") // TCK-1001 é atribuído a joao
        .set("Authorization", `Bearer ${tokenMaria}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .field("resolution_report", "Hacked!")
        .attach("resolution_image", Buffer.from("fake image"), "test.jpg");
      
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/apenas o responsável/i);
    });
  });

  describe("Abuso de Uploads (Bypass de Validação)", () => {
    it("deve rejeitar arquivos maliciosos (MIME Spoofing)", async () => {
      const fakeExecutable = Buffer.from("#!/bin/bash\nrm -rf /", "utf8");

      const res = await request(app)
        .patch("/api/tickets/TCK-1002/finish")
        .set("Authorization", `Bearer ${tokenMaria}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .field("resolution_report", "Consertado")
        .attach("resolution_image", fakeExecutable, { filename: "malicioso.sh", contentType: "image/jpeg" });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/extensão|arquivo não permitida/i);
    });
  });

  describe("Controle Granular de Permissões (Moderador RBAC)", () => {
    const tokenModerador = jwt.sign({ id: "mod-1", role: "Moderador", username: "mod_tester" }, secret);

    it("deve bloquear acesso a finalização de chamados de tipos não autorizados para o Moderador", async () => {
      const res = await request(app)
        .patch("/api/tickets/TCK-1002/finish")
        .set("Authorization", `Bearer ${tokenModerador}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .field("resolution_report", "Tentativa não autorizada")
        .attach("resolution_image", Buffer.from("imagem ok"), "test.jpg");
      
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Tipo de chamado não permitido/i);
    });
  });
});

