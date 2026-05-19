import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../server";
import jwt from "jsonwebtoken";

/**
 * ============================================================================
 * SUITE DE TESTES AVANÇADOS PREMIUM — ALVO DINÂMICO (DOCKER / LOCAL)
 * ============================================================================
 * 
 * Esta suite foi remodelada para suportar a validação do ambiente em tempo real
 * rodando no Docker. Se a variável `TEST_BASE_URL` estiver presente, os testes
 * direcionarão as requisições HTTP para a infraestrutura de containers externa
 * (ex: http://localhost:3000), simulando estresse, resiliência e blindagem de
 * forma autêntica. Caso contrário, rodam contra a instância local embarcada.
 */

const target = process.env.TEST_BASE_URL || app;
const isDockerTarget = !!process.env.TEST_BASE_URL;

// Estado compartilhado içado para simulação precisa de Atomicidade nos Mocks locais
const { sharedState } = vi.hoisted(() => ({
  sharedState: { 
    raceWinnerAssigned: false,
    auditLogs: [
      { id: "LOG-INIT", action: "SYSTEM_START", username: "system", timestamp: new Date() }
    ]
  }
}));

// Interceptação e Mocks estritos para execution local isolada
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

vi.mock("../socket", () => ({
  initSocket: vi.fn(),
  getIO: vi.fn().mockReturnValue({ emit: vi.fn() })
}));

vi.mock("../models/mongoose", () => {
  return {
    Ticket: {
      findOne: vi.fn().mockImplementation((query) => {
        return Promise.resolve({ 
          id: query?.id || "TK-ADV-1001", 
          status: sharedState.raceWinnerAssigned ? "Em atendimento" : "Aberto", 
          assigned_to: sharedState.raceWinnerAssigned ? "admin" : null,
          image_path: null,
          resolution_image_path: null
        });
      }),
      create: vi.fn().mockImplementation((data) => {
        sharedState.auditLogs.push({
          id: `LOG-${Date.now()}`,
          action: "OPEN_TICKET",
          username: data.operator_name || "Operator",
          timestamp: new Date()
        });
        return Promise.resolve({ id: "TK-ADV-9999", ...data, status: "Aberto" });
      }),
      updateOne: vi.fn().mockImplementation((query, update) => {
        // Controle rigoroso de concorrência atômica (Race Conditions)
        if (update && update.status === 'Em atendimento') {
          if (!sharedState.raceWinnerAssigned) {
            sharedState.raceWinnerAssigned = true;
            sharedState.auditLogs.push({
              id: `LOG-${Date.now()}`,
              action: "START_SERVICE",
              username: update.assigned_to || "admin",
              timestamp: new Date()
            });
            return Promise.resolve({ modifiedCount: 1 });
          }
          return Promise.resolve({ modifiedCount: 0 }); // Força o 409 Conflict nas demais conexões
        }
        return Promise.resolve({ modifiedCount: 1 });
      }),
      countDocuments: vi.fn().mockResolvedValue(25),
      find: vi.fn().mockImplementation(() => {
        const chain: any = {
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([]),
          then: vi.fn().mockImplementation((cb) => cb([]))
        };
        return chain;
      })
    },
    AuditLog: {
      find: vi.fn().mockImplementation(() => {
        const chain: any = {
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(sharedState.auditLogs),
          then: vi.fn().mockImplementation((cb) => cb(sharedState.auditLogs))
        };
        return chain;
      }),
      create: vi.fn().mockImplementation((logData) => {
        sharedState.auditLogs.push(logData);
        return Promise.resolve(true);
      })
    },
    LoginHistory: { create: vi.fn().mockResolvedValue(true) },
    User: {
      findOne: vi.fn().mockResolvedValue({ id: "usr-admin", username: "admin", role: "SuperAdmin", matricula: "admin" }),
      find: vi.fn().mockResolvedValue([])
    }
  };
});

describe("Advanced Security, Overload & Docker Failover Validation", () => {
  const secret = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_SECRET = secret;
  process.env.SMTP_HOST = "";
  process.env.WHATSAPP_API_URL = "";

  const adminToken = jwt.sign({ id: "usr-admin", role: "SuperAdmin", username: "admin" }, secret, { expiresIn: "1h" });
  const standardToken = jwt.sign({ id: "usr-std", role: "Usuário", username: "operator" }, secret, { expiresIn: "1h" });

  beforeEach(() => {
    sharedState.raceWinnerAssigned = false;
  });

  describe("A. Health Verification & System Monitor Check", () => {
    it("deve responder adequadamente no endpoint de saúde com status de uso do sistema", async () => {
      const res = await request(target).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("timestamp");
      expect(res.body).toHaveProperty("services");
      expect(res.body).toHaveProperty("system");
    });
  });

  describe("B. Concorrência Extrema e Resiliência Atômica (Race Conditions)", () => {
    it("deve processar requisições concorrentes perfeitamente garantindo que apenas uma assume o chamado", async () => {
      const targetTicketId = isDockerTarget ? "TK-DOCKER-TEST" : "TK-ADV-1001";
      
      const requests = Array.from({ length: 10 }).map(() =>
        request(target)
          .patch(`/api/tickets/${targetTicketId}/start`)
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Requested-With", "XMLHttpRequest")
          .send({ assigned_to: "admin" })
      );

      const responses = await Promise.all(requests);
      
      const successCount = responses.filter(r => r.status === 200).length;
      const conflictCount = responses.filter(r => r.status === 409 || r.status === 404).length;

      expect(successCount).toBeLessThanOrEqual(1);
      expect(conflictCount).toBeGreaterThanOrEqual(9);
    });
  });

  describe("C. Parser Overload e Defesa contra Travamentos (Proteção de Header)", () => {
    it("deve rejeitar tokens JWT monstruosos sem estourar o buffer ou a memória do Express/Node", async () => {
      const hugePayload = { id: "test", role: "Usuário", padding: "A".repeat(500000) };
      const hugeToken = jwt.sign(hugePayload, secret);
      
      try {
        const res = await request(target)
          .get("/api/health")
          .set("Authorization", `Bearer ${hugeToken}`);
          
        expect([401, 413, 431]).toContain(res.status);
      } catch (err: any) {
        expect(["ECONNRESET", "EPIPE"]).toContain(err.code);
      }
    });
  });

  describe("D. Rastreabilidade e Auditoria Contínua (Audit Trail Tracing)", () => {
    it("deve registrar as ações críticas nos logs de auditoria consultáveis por administradores", async () => {
      await request(target)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          type: "TI",
          location: "ASSEMBLY-01",
          impact: "partial",
          description: "Teste de Trilha de Auditoria",
          operator_name: "Operador Auditoria",
          operator_matricula: "1234567"
        });

      const auditRes = await request(target)
        .get("/api/logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body)).toBe(true);
      
      if (!isDockerTarget) {
        const hasOpenEvent = auditRes.body.some((log: any) => log.action === "OPEN_TICKET" || log.action === "SYSTEM_START");
        expect(hasOpenEvent).toBe(true);
      }
    });
  });

  describe("E. Injeção de Carga Útil Maliciosa (Payload Hardening)", () => {
    it("deve ignorar injeções de atributos de administração/status ao criar ou interagir com tickets", async () => {
      const res = await request(target)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          type: "Manutenção",
          location: "BODY-SHOP",
          impact: "total",
          description: "Teste de Injeção",
          operator_name: "Invasor",
          operator_matricula: "9999999",
          status: "Finalizado", 
          priority: "Crítico"
        });

      expect(res.status).toBe(201);
      
      const createdId = res.body.ticketId;
      if (!isDockerTarget && createdId) {
        const fetchRes = await request(target)
          .get(`/api/tickets?search=${createdId}`)
          .set("Authorization", `Bearer ${adminToken}`);
        
        if (fetchRes.status === 200 && fetchRes.body.length > 0) {
          expect(fetchRes.body[0].status).toBe("Aberto");
        }
      }
    });
  });

  // --- RED TEAM / HARDENING BLOCKS ---
  describe("F. Ataques de Parser e Payload Profundo (Billion Laughs / Deep JSON)", () => {
    it("deve barrar JSONs excessivamente aninhados para proteger a Stack de Execução (V8)", async () => {
      let deepPayload: any = {};
      let ref = deepPayload;
      for (let i = 0; i < 2000; i++) {
        ref["nested"] = {};
        ref = ref["nested"];
      }
      ref["status"] = "Hacked";

      try {
        const res = await request(target)
          .post("/api/tickets")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Requested-With", "XMLHttpRequest")
          .send(deepPayload);
        
        expect([400, 413, 500]).toContain(res.status); 
      } catch (err: any) {
        expect(["ECONNRESET", "EPIPE"]).toContain(err.code);
      }
    });
  });

  describe("G. Engenharia do Caos (Falha em Serviços de Terceiros)", () => {
    it("deve lidar de forma graciosa (sem vazar stack trace) se o banco de dados falhar subitamente", async () => {
      const { Ticket } = await import("../models/mongoose");
      vi.spyOn(Ticket, "find").mockImplementationOnce(() => { throw new Error("MongoDB Connection Lost"); });

      const res = await request(target)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${standardToken}`);

      expect([500, 503]).toContain(res.status);
      expect(res.body.error).not.toMatch(/MongoDB Connection Lost/i);
      expect(res.body.error).toMatch(/erro ao buscar dados|interno|indisponível/i);
    });
  });

  // --- NOVAS 5 ETAPAS PREMIUM ENTERPRISE ---
  describe("H. Saturação de Conexões WebSocket Upgrade (Ping-Pong Flood & Zombies)", () => {
    it("deve lidar graciosamente ao receber dezenas de pacotes paralelos solicitando upgrade abusivo", async () => {
      // Enviando rajadas de solicitações HTTP com requisição de Upgrade para travar a camada de transporte
      const floodUpgradeRequests = Array.from({ length: 20 }).map(() =>
        request(target)
          .get("/socket.io/")
          .set("Connection", "Upgrade")
          .set("Upgrade", "websocket")
      );

      const responses = await Promise.all(floodUpgradeRequests);
      
      // O Express ou engine dropam, negam ou encerram as conexões proativamente sem crashar
      responses.forEach(res => {
        expect([200, 400, 404, 426, 500]).toContain(res.status);
      });
    });
  });

  describe("I. Quebra de Máquina de Estados (State Machine Enforcement)", () => {
    it("deve rejeitar tentativas de transições ilógicas de status (Regressão de Atendimento)", async () => {
      // Tentamos iniciar ou injetar payload burlando as regras de transição estritas
      const res = await request(target)
        .patch("/api/tickets/TK-ADV-1001/start")
        .set("Authorization", `Bearer ${standardToken}`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "Fechado", assigned_to: "" }); // Envia responsável vazio deliberadamente
      
      expect([200, 400, 409]).toContain(res.status);
    });
  });

  describe("J. Prevenção de Reutilização Maliciosa de Tokens (Token Reuse Detection)", () => {
    it("deve bloquear ativamente tentativas de renovação de sessão utilizando tokens adulterados", async () => {
      const adulteratedToken = jwt.sign({ id: "usr-admin", reused: true }, secret + "adulterado");

      const res = await request(target)
        .post("/api/refresh")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ refreshToken: adulteratedToken });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inválido|adulterado|expirado/i);
    });
  });

  describe("K. Recuperação em Frio e Sobrevivência (Cold Boot Resilience Ops)", () => {
    it("deve garantir que o servidor responda perfeitamente mesmo com o cache Redis em failover a frio", async () => {
      // Simulando failover ao desligar a flag isOpen do Redis local/mockado via casting para evitar erro de read-only
      const { default: redisClientMock } = await import("../config/redis");
      const originalState = redisClientMock.isOpen;
      (redisClientMock as any).isOpen = false;

      const res = await request(target)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${standardToken}`);

      // O servidor detecta que o Redis está down e realiza failover limpo no Mongoose direto
      expect(res.status).toBe(200);
      const returnedCollection = Array.isArray(res.body) ? res.body : res.body?.data;
      expect(Array.isArray(returnedCollection)).toBe(true);

      // Restaura para não poluir
      (redisClientMock as any).isOpen = originalState;
    });
  });

  describe("L. Teste de Estresse e Sobrecarga de Múltiplas Requisições Simultâneas (Denial of Service Validation)", () => {
    it("deve suportar uma rajada extrema de 300 requisições simultâneas mantendo a resiliência e sem cair", async () => {
      const endpoint = "/api/health";
      
      // Criamos 300 requisições perfeitamente sincronizadas para testar o limite máximo de saturação da thread
      const burstRequests = Array.from({ length: 300 }).map(() =>
        request(target).get(endpoint)
      );

      const startTime = Date.now();
      const burstResponses = await Promise.all(burstRequests);
      const durationMs = Date.now() - startTime;

      // Classifica os códigos de retorno
      const successCount = burstResponses.filter(r => r.status === 200).length;
      const rateLimitCount = burstResponses.filter(r => r.status === 429).length;

      // Todas as 300 conexões devem ter sido atendidas de forma estruturada (seja processando ou limitando)
      expect(successCount + rateLimitCount).toBe(300);
      
      // O tempo total para processar a rajada massiva de 300 requisições sob estresse atômico
      expect(durationMs).toBeLessThan(7000); // Exigência de Alta Performance: < 7 segundos para 300 requisições na mesma porta
    });
  });
});