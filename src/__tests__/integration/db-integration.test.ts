import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User, Ticket } from '../../models/mongoose';
import { TicketService } from '../../services/TicketService';
import { UserService } from '../../services/UserService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await User.syncIndexes();
  await Ticket.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Ticket.deleteMany({});
});

describe('Database Integration Tests', () => {
  describe('RBAC & Auth Integration', () => {
    it('should enforce unique matricula for users', async () => {
      await User.create({
        id: 'USR-0001',
        username: 'User 1',
        matricula: '1111111',
        password: 'hashedpassword',
        role: 'Admin'
      });

      const duplicateUser = new User({
        id: 'USR-0002',
        username: 'User 2',
        matricula: '1111111',
        password: 'hashedpassword',
        role: 'Operador'
      });

      await expect(duplicateUser.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should default Moderador allowedTicketTypes to empty array', async () => {
      const user = await User.create({
        id: 'USR-0003',
        username: 'Mod User',
        matricula: '2222222',
        password: 'pwd',
        role: 'Moderador'
      });

      expect(user.allowedTicketTypes).toBeDefined();
      expect(Array.isArray(user.allowedTicketTypes)).toBe(true);
      expect(user.allowedTicketTypes?.length).toBe(0);
    });
  });

  describe('Tickets Integration', () => {
    it('should save a ticket correctly with proper defaults', async () => {
      const ticket = await Ticket.create({
        id: 'TK-9999',
        type: 'Colisão',
        location: 'WS-01',
        operator_name: 'Operator Name',
        operator_matricula: '1234567',
        priority: 'Crítico',
        observation: 'A collision occurred'
      });

      expect(ticket.status).toBe('Aberto');
      expect(ticket.created_at).toBeDefined();
      expect(ticket.operational_impact).toBeUndefined();
    });

    it('should run Ticket stats aggregation correctly', async () => {
      await Ticket.create([
        { id: 'TK-1001', type: 'Colisão', location: 'WS-01', operator_name: 'O1', operator_matricula: '1111111', priority: 'Crítico', status: 'Aberto' },
        { id: 'TK-1002', type: 'Falta de peças', location: 'WS-02', operator_name: 'O2', operator_matricula: '2222222', priority: 'Alto', status: 'Em atendimento' },
        { id: 'TK-1003', type: 'AGV com falha', location: 'QC-LINE', operator_name: 'O3', operator_matricula: '3333333', priority: 'Médio', status: 'Finalizado' },
        { id: 'TK-1004', type: 'Colisão', location: 'LOG-AREA', operator_name: 'O1', operator_matricula: '1111111', priority: 'Crítico', status: 'Finalizado' },
      ]);

      const ticketService = new TicketService();
      
      // Mock methods that cause issues in integration test (like redis/sockets)
      ticketService.clearCache = async () => {};

      const stats = await ticketService.getStats({ role: 'SuperAdmin' });

      expect(stats.total).toBe(4);
      expect(stats.open).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.finished).toBe(2);
      expect(stats.critical).toBe(2);
      expect(stats.high).toBe(1);
    });
  });
});
