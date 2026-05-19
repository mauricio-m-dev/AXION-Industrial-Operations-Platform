import { log } from "./logger";

export enum CircuitState {
  CLOSED, // Tudo funcionando
  OPEN,   // Falhando, bloqueando chamadas rápidas
  HALF_OPEN // Tentando recuperar
}

export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private failures: number = 0;
  private state: CircuitState = CircuitState.CLOSED;
  private nextAttempt: number = Date.now();
  private name: string;

  constructor(name: string, failureThreshold = 3, recoveryTimeoutMs = 10000) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeoutMs;
  }

  async fire<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() > this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        log(`CircuitBreaker [${this.name}]: State changed to HALF_OPEN. Retrying...`, "WARN");
      } else {
        if (fallback) return fallback();
        throw new Error(`CircuitBreaker [${this.name}] is OPEN. Call blocked.`);
      }
    }

    try {
      const result = await action();
      this.reset();
      return result;
    } catch (error: any) {
      this.recordFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    log(`CircuitBreaker [${this.name}]: Failure recorded (${this.failures}/${this.failureThreshold})`, "WARN");
    
    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      log(`CircuitBreaker [${this.name}]: Threshold reached. State changed to OPEN. Next attempt in ${this.recoveryTimeout}ms`, "ERROR");
    }
  }

  private reset() {
    if (this.state !== CircuitState.CLOSED) {
      log(`CircuitBreaker [${this.name}]: Connection restored. State changed to CLOSED.`, "INFO");
    }
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }
}
