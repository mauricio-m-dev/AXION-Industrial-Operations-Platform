import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CircuitBreaker, CircuitState } from "../utils/circuitBreaker";
import { analyzeSystemHealth, type SystemMetrics } from "../utils/intelligence";
import { encrypt, decrypt } from "../utils/crypto";
import { loginSchema, userSchema, ticketSchema, feedbackSchema } from "../models/schemas";

/**
 * ============================================================================
 * SUITE DE TESTES UNITÁRIOS DE MÓDULOS INTERNOS — ENTERPRISE CORE
 * ============================================================================
 * 
 * Cobre os utilitários de infraestrutura que NÃO são testados via HTTP:
 * - CircuitBreaker (resiliência de cache)
 * - Intelligence Module (diagnóstico automatizado)
 * - Crypto AES-256 (criptografia/descriptografia de dados sensíveis)
 * - Zod Schemas (validação estrita de payloads)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CIRCUIT BREAKER — VALIDAÇÃO COMPLETA DO PADRÃO DE RESILIÊNCIA
// ═══════════════════════════════════════════════════════════════════════════════

describe("CircuitBreaker — Padrão de Resiliência Enterprise", () => {

  it("deve executar a ação normalmente quando o circuito está FECHADO (CLOSED)", async () => {
    const cb = new CircuitBreaker("test-closed", 3, 1000);
    const result = await cb.fire(() => Promise.resolve("OK"));
    expect(result).toBe("OK");
  });

  it("deve registrar falhas e abrir o circuito após atingir o threshold", async () => {
    const cb = new CircuitBreaker("test-open", 2, 1000);
    const failingAction = () => Promise.reject(new Error("DB Down"));
    const fallback = () => Promise.resolve("FALLBACK");

    // Falha 1 e 2 → com fallback para não lançar exceção
    await cb.fire(failingAction, fallback);
    await cb.fire(failingAction, fallback);

    // Após 2 falhas (threshold=2), o circuito deve estar ABERTO
    // A próxima chamada deve acionar o fallback diretamente sem tentar a ação
    const result = await cb.fire(failingAction, fallback);
    expect(result).toBe("FALLBACK");
  });

  it("deve lançar erro quando o circuito está ABERTO e não há fallback", async () => {
    const cb = new CircuitBreaker("test-no-fallback", 1, 5000);
    const failingAction = () => Promise.reject(new Error("Fail"));

    // 1 falha = threshold atingido
    try { await cb.fire(failingAction); } catch {}

    // Sem fallback → deve lançar erro explícito de CircuitBreaker
    await expect(cb.fire(failingAction)).rejects.toThrow(/OPEN/);
  });

  it("deve transicionar para HALF_OPEN e recuperar após o tempo de recovery", async () => {
    const cb = new CircuitBreaker("test-recovery", 1, 50); // 50ms de recovery
    const failingAction = () => Promise.reject(new Error("Fail"));
    const successAction = () => Promise.resolve("RECOVERED");
    const fallback = () => Promise.resolve("FALLBACK");

    // Falha inicial → abre o circuito
    await cb.fire(failingAction, fallback);

    // Aguarda o tempo de recovery
    await new Promise(resolve => setTimeout(resolve, 60));

    // Agora deve tentar novamente (HALF_OPEN) e recuperar
    const result = await cb.fire(successAction);
    expect(result).toBe("RECOVERED");
  });

  it("deve retornar o fallback corretamente quando a ação principal falha (mas threshold não atingido)", async () => {
    const cb = new CircuitBreaker("test-fallback-pre-open", 5, 1000);
    const result = await cb.fire(
      () => Promise.reject(new Error("Transient")),
      () => Promise.resolve("GRACEFUL_DEGRADATION")
    );
    expect(result).toBe("GRACEFUL_DEGRADATION");
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// 2. INTELLIGENCE MODULE — DIAGNÓSTICO AUTOMATIZADO DE SAÚDE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Intelligence Module — Diagnóstico de Saúde do Sistema", () => {

  it("deve retornar risco 'Low' e score 100 para métricas perfeitas", () => {
    const metrics: SystemMetrics = { avgCpu: 0.2, avgRam: 40, errorRate: 0, avgLatency: 50, dbLatency: 10 };
    const result = analyzeSystemHealth(metrics);
    expect(result.riskLevel).toBe("Low");
    expect(result.score).toBe(100);
    expect(result.recommendations.length).toBeGreaterThan(0); // Recomendação de manutenção padrão
  });

  it("deve retornar risco 'Critical' para CPU e RAM extremamente altas", () => {
    const metrics: SystemMetrics = { avgCpu: 0.95, avgRam: 95, errorRate: 15, avgLatency: 1500, dbLatency: 200 };
    const result = analyzeSystemHealth(metrics);
    expect(result.riskLevel).toBe("Critical");
    expect(result.score).toBeLessThan(40);
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
  });

  it("deve retornar risco 'Medium' para cenário de atenção moderada", () => {
    const metrics: SystemMetrics = { avgCpu: 0.70, avgRam: 70, errorRate: 2, avgLatency: 200, dbLatency: 120 };
    const result = analyzeSystemHealth(metrics);
    expect(result.riskLevel).toBe("Medium");
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThan(85);
  });

  it("deve retornar risco 'High' para latência de API degradada e taxa de erros alarmante", () => {
    const metrics: SystemMetrics = { avgCpu: 0.5, avgRam: 60, errorRate: 12, avgLatency: 1200, dbLatency: 50 };
    const result = analyzeSystemHealth(metrics);
    expect(result.riskLevel).toBe("High");
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.stringMatching(/Latência de API/i),
      expect.stringMatching(/Taxa de erros/i)
    ]));
  });

  it("deve retornar recomendações de escalamento vertical quando CPU está no limite", () => {
    const metrics: SystemMetrics = { avgCpu: 0.90, avgRam: 50, errorRate: 1, avgLatency: 100, dbLatency: 20 };
    const result = analyzeSystemHealth(metrics);
    expect(result.recommendations).toEqual(expect.arrayContaining([
      expect.stringMatching(/Escalonamento vertical/i)
    ]));
  });

  it("deve retornar recomendações de índices MongoDB quando dbLatency é alto", () => {
    const metrics: SystemMetrics = { avgCpu: 0.3, avgRam: 50, errorRate: 0, avgLatency: 200, dbLatency: 150 };
    const result = analyzeSystemHealth(metrics);
    expect(result.recommendations).toEqual(expect.arrayContaining([
      expect.stringMatching(/índices/i)
    ]));
  });

  it("deve recomendar verificação de memory leaks quando RAM > 90%", () => {
    const metrics: SystemMetrics = { avgCpu: 0.4, avgRam: 92, errorRate: 0, avgLatency: 100, dbLatency: 20 };
    const result = analyzeSystemHealth(metrics);
    expect(result.recommendations).toEqual(expect.arrayContaining([
      expect.stringMatching(/memory leaks/i)
    ]));
  });

  it("deve garantir que o score nunca seja negativo (floor em 0)", () => {
    const metrics: SystemMetrics = { avgCpu: 0.99, avgRam: 99, errorRate: 50, avgLatency: 5000, dbLatency: 500 };
    const result = analyzeSystemHealth(metrics);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// 3. CRYPTO AES-256 — CRIPTOGRAFIA E DESCRIPTOGRAFIA DE DADOS SENSÍVEIS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Crypto AES-256-CBC — Criptografia de Dados Industriais", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "test_key_that_is_long_enough_for_aes_256_min_32_chars";
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  it("deve criptografar e descriptografar corretamente um texto simples", () => {
    const originalText = "axion-secret-api-key-2026";
    const encrypted = encrypt(originalText);
    expect(encrypted).not.toBe(originalText);
    expect(encrypted).toContain(":"); // formato IV:ciphertext
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it("deve retornar null para inputs nulos ou undefined", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
  });

  it("deve retornar texto legado (não criptografado) sem quebrar na descriptografia", () => {
    const legacyPlainText = "dado-legado-sem-criptografia";
    const result = decrypt(legacyPlainText);
    expect(result).toBe(legacyPlainText);
  });

  it("deve gerar IVs diferentes para o mesmo texto (segurança contra análise de padrões)", () => {
    const text = "mesma-chave-mesma-entrada";
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);
    expect(encrypted1).not.toBe(encrypted2); // IVs aleatórios garantem resultados diferentes
    expect(decrypt(encrypted1)).toBe(text);
    expect(decrypt(encrypted2)).toBe(text);
  });

  it("não deve criptografar novamente um texto já criptografado (idempotência)", () => {
    const text = "dado-original";
    const encrypted = encrypt(text)!;
    const doubleEncrypted = encrypt(encrypted);
    expect(doubleEncrypted).toBe(encrypted); // Deve reconhecer o formato e retornar sem alterar
  });

  it("deve criptografar strings vazias retornando null", () => {
    expect(encrypt("")).toBeNull();
  });

  it("deve lidar com textos longos (payloads industriais extensos)", () => {
    const longText = "A".repeat(10000);
    const encrypted = encrypt(longText);
    expect(encrypted).not.toBeNull();
    const decrypted = decrypt(encrypted!);
    expect(decrypted).toBe(longText);
  });

  it("deve retornar o texto original se a descriptografia falhar (fallback gracioso)", () => {
    const corruptedCiphertext = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:invalidhex";
    const result = decrypt(corruptedCiphertext);
    // Deve retornar o texto original sem crashar
    expect(result).toBe(corruptedCiphertext);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// 4. ZOD SCHEMAS — VALIDAÇÃO ESTRITA DE PAYLOADS DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════════

describe("Zod Schemas — Validação de Payloads Industriais", () => {

  describe("loginSchema", () => {
    it("deve aceitar matrícula com exatamente 7 dígitos numéricos", () => {
      const result = loginSchema.safeParse({ matricula: "1234567", password: "senha123" });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar matrícula com menos de 7 dígitos", () => {
      const result = loginSchema.safeParse({ matricula: "12345", password: "senha123" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar matrícula com mais de 7 dígitos", () => {
      const result = loginSchema.safeParse({ matricula: "12345678", password: "senha123" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar matrícula com letras ou caracteres especiais", () => {
      expect(loginSchema.safeParse({ matricula: "abc1234", password: "x" }).success).toBe(false);
      expect(loginSchema.safeParse({ matricula: "12-34-56", password: "x" }).success).toBe(false);
      expect(loginSchema.safeParse({ matricula: "123 456", password: "x" }).success).toBe(false);
    });

    it("deve rejeitar senha vazia", () => {
      const result = loginSchema.safeParse({ matricula: "1234567", password: "" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar payload vazio", () => {
      expect(loginSchema.safeParse({}).success).toBe(false);
      expect(loginSchema.safeParse(null).success).toBe(false);
      expect(loginSchema.safeParse(undefined).success).toBe(false);
    });

    it("deve rejeitar injeção NoSQL no campo matricula", () => {
      const result = loginSchema.safeParse({ matricula: { $gt: "" }, password: "x" });
      expect(result.success).toBe(false);
    });
  });

  describe("userSchema", () => {
    it("deve aceitar um payload válido de criação de usuário", () => {
      const result = userSchema.safeParse({ username: "operador1", matricula: "1234567", password: "Senha@123" });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar username com menos de 3 caracteres", () => {
      const result = userSchema.safeParse({ username: "ab", matricula: "1234567", password: "Senha@123" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha com menos de 6 caracteres", () => {
      const result = userSchema.safeParse({ username: "teste", matricula: "1234567", password: "12345" });
      expect(result.success).toBe(false);
    });

    it("deve aceitar email válido e rejeitar email inválido", () => {
      expect(userSchema.safeParse({ username: "op", matricula: "1234567", password: "123456", email: "x@y.com" }).success).toBe(false); // username too short
      expect(userSchema.safeParse({ username: "operador", matricula: "1234567", password: "123456", email: "invalido" }).success).toBe(false);
      expect(userSchema.safeParse({ username: "operador", matricula: "1234567", password: "123456", email: "op@axion.com" }).success).toBe(true);
    });

    it("deve aceitar allowedTicketTypes como array de strings", () => {
      const result = userSchema.safeParse({ username: "mod1", matricula: "1234567", password: "123456", allowedTicketTypes: ["Mecânica", "TI"] });
      expect(result.success).toBe(true);
    });
  });

  describe("ticketSchema", () => {
    it("deve aceitar um ticket com type e location obrigatórios", () => {
      const result = ticketSchema.safeParse({ type: "Manutenção", location: "LINHA-01" });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar ticket sem type", () => {
      const result = ticketSchema.safeParse({ location: "LINHA-01" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar ticket sem location", () => {
      const result = ticketSchema.safeParse({ type: "TI" });
      expect(result.success).toBe(false);
    });

    it("deve aceitar campos opcionais (agv_number, observation, etc.)", () => {
      const result = ticketSchema.safeParse({
        type: "AGV com falha", location: "ASSEMBLY-01",
        agv_number: "42", part_name: "Sensor Laser", observation: "Detectado ruído anormal"
      });
      expect(result.success).toBe(true);
    });

    it("deve validar operator_matricula como 7 dígitos quando presente", () => {
      expect(ticketSchema.safeParse({ type: "TI", location: "X", operator_matricula: "123" }).success).toBe(false);
      expect(ticketSchema.safeParse({ type: "TI", location: "X", operator_matricula: "1234567" }).success).toBe(true);
      expect(ticketSchema.safeParse({ type: "TI", location: "X", operator_matricula: "" }).success).toBe(true); // empty allowed
    });
  });

  describe("feedbackSchema", () => {
    it("deve aceitar feedback completo e válido", () => {
      const result = feedbackSchema.safeParse({ matricula: "1234567", name: "João", feedback: "Ótimo sistema!" });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar feedback sem nome", () => {
      expect(feedbackSchema.safeParse({ matricula: "1234567", name: "", feedback: "ok" }).success).toBe(false);
    });

    it("deve rejeitar feedback sem texto", () => {
      expect(feedbackSchema.safeParse({ matricula: "1234567", name: "X", feedback: "" }).success).toBe(false);
    });

    it("deve rejeitar matrícula inválida no feedback", () => {
      expect(feedbackSchema.safeParse({ matricula: "abc", name: "X", feedback: "ok" }).success).toBe(false);
    });
  });
});
