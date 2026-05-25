import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApmService } from '../../services/ApmService';
import { Ticket, ApmMetric, AuditLog, ApmReport } from '../../models/mongoose';
import * as monitor from '../../utils/monitor';

vi.mock('../../models/mongoose', () => ({
  Ticket: {
    aggregate: vi.fn(),
    find: vi.fn(),
  },
  ApmMetric: { find: vi.fn() },
  AuditLog: { find: vi.fn() },
  ApmReport: { create: vi.fn() }
}));

vi.mock('../../utils/monitor', () => ({
  getSystemMetrics: vi.fn(),
  getRedisHealth: vi.fn()
}));

vi.mock('../../utils/intelligence', () => ({
  analyzeSystemHealth: vi.fn()
}));

describe('ApmService Unit Tests', () => {
  let apmService: ApmService;

  beforeEach(() => {
    vi.clearAllMocks();
    apmService = new ApmService();
  });

  describe('generateReport', () => {
    it('should calculate averages and call analyzeSystemHealth', async () => {
      const intelligence = await import('../../utils/intelligence');
      (intelligence.analyzeSystemHealth as any).mockReturnValue({
        score: 95,
        riskLevel: 'LOW',
        findings: ['All good'],
        recommendations: [],
        status: 'Healthy'
      });

      const mockMetrics = [{ cpu_usage: 10, ram_used_mb: 50, ram_total_mb: 100, avg_latency_ms: 20 }];
      const mockAuditLogs = [{ action: 'ERROR_SOMETHING' }, { action: 'SUCCESS' }];
      const mockTickets = [{}, {}];

      (ApmMetric.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockMetrics) });
      (AuditLog.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockAuditLogs) });
      (Ticket.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockTickets) });
      (ApmReport.create as any).mockResolvedValue({ id: 'REP-TEST' });

      const report = await apmService.generateReport('24h');

      expect(ApmReport.create).toHaveBeenCalledWith(expect.objectContaining({
        summary: expect.objectContaining({
          total_tickets: 2,
          total_errors: 1
        })
      }));
      expect(report.id).toBe('REP-TEST');
    });
  });
});
