import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketService } from '../../services/TicketService';
import { Ticket } from '../../models/mongoose';
import redisClient from '../../config/redis';
import * as notifications from '../../utils/notifications';
import * as audit from '../../utils/audit';
import * as socket from '../../socket';

vi.mock('../../models/mongoose', () => ({
  Ticket: {
    create: vi.fn(),
    aggregate: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }
}));

vi.mock('../../config/redis', () => ({
  default: {
    isOpen: true,
    del: vi.fn(),
  }
}));

vi.mock('../../utils/notifications', () => ({
  notifyUsersAboutTicket: vi.fn(),
  notifyUsersAboutTicketFinished: vi.fn()
}));

vi.mock('../../utils/audit', () => ({
  logAudit: vi.fn()
}));

vi.mock('../../socket', () => ({
  emitSelectiveTicketsUpdated: vi.fn().mockResolvedValue(undefined)
}));

describe('TicketService Unit Tests', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    vi.clearAllMocks();
    ticketService = new TicketService();
  });

  describe('createTicket', () => {
    it('should create a ticket with Crítico priority if type is Colisão', async () => {
      const data = {
        type: 'Colisão',
        location: 'WS-01',
        observation: 'Test collision',
        operator_matricula: '1234567'
      };
      
      const mockId = 'TK-1234';
      vi.spyOn(require('crypto'), 'randomInt').mockReturnValue(1234);
      
      const id = await ticketService.createTicket(data, null, 'Operator 1');
      
      expect(Ticket.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'Colisão',
        priority: 'Crítico',
        location: 'WS-01',
        operator_name: 'Operator 1'
      }));
      
      expect(audit.logAudit).toHaveBeenCalledWith('OPEN_TICKET', 'Operator 1', { ticketId: id, type: 'Colisão' });
      expect(notifications.notifyUsersAboutTicket).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
      expect(socket.emitSelectiveTicketsUpdated).toHaveBeenCalledWith('Colisão');
    });

    it('should assign Alto priority to AGV com falha in Critical Loc', async () => {
      const data = {
        type: 'AGV com falha',
        location: 'ASSEMBLY-01', // Critical loc
        observation: 'AGV stopped',
        operator_matricula: '1234567'
      };
      
      await ticketService.createTicket(data, null, 'Operator 2');
      
      expect(Ticket.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'Alto'
      }));
    });
  });

  describe('getStats', () => {
    it('should calculate stats correctly for SuperAdmin', async () => {
      const mockStatusData = [
        { _id: 'Aberto', count: 5 },
        { _id: 'Em atendimento', count: 3 },
        { _id: 'Finalizado', count: 10 }
      ];
      const mockPriorityData = [
        { _id: 'Crítico', count: 2 },
        { _id: 'Alto', count: 4 }
      ];

      (Ticket.aggregate as any).mockResolvedValueOnce(mockStatusData);
      (Ticket.aggregate as any).mockResolvedValueOnce(mockPriorityData);

      const stats = await ticketService.getStats({ role: 'SuperAdmin' });

      expect(Ticket.aggregate).toHaveBeenCalledTimes(2);
      expect(stats).toEqual({
        total: 18,
        open: 5,
        pending: 3,
        finished: 10,
        critical: 2,
        high: 4
      });
    });

    it('should restrict stats for Moderador based on allowedTicketTypes', async () => {
      (Ticket.aggregate as any).mockResolvedValue([]);
      
      await ticketService.getStats({ role: 'Moderador', allowedTicketTypes: ['AGV com falha'] });

      expect(Ticket.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { type: { $in: ['AGV com falha'] } } },
          expect.anything()
        ])
      );
    });
  });
});
