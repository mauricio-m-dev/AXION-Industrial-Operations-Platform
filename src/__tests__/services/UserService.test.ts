import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../services/UserService';
import { User } from '../../models/mongoose';
import argon2 from 'argon2';

vi.mock('../../models/mongoose', () => ({
  User: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn()
  }
}));

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashedPassword'),
    verify: vi.fn()
  }
}));

describe('UserService Unit Tests', () => {
  let userService: UserService;
  const mockSuperAdmin = { role: 'SuperAdmin' };

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();
  });

  describe('createUser', () => {
    it('should throw an error if matricula already exists', async () => {
      (User.findOne as any).mockResolvedValue({ _id: '123', matricula: '9999999' });

      await expect(userService.createUser({
        username: 'Test User',
        matricula: '9999999',
        password: 'password',
        role: 'Admin'
      }, mockSuperAdmin)).rejects.toThrow('Matrícula já está em uso');
      
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should hash password and create user if matricula is unique', async () => {
      (User.findOne as any).mockResolvedValue(null);
      (User.create as any).mockResolvedValue({ _id: '123', username: 'Test User' });

      const result = await userService.createUser({
        username: 'Test User',
        matricula: '1234567',
        password: 'password',
        role: 'Admin'
      }, mockSuperAdmin);

      expect(argon2.hash).toHaveBeenCalledWith('password');
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        matricula: '1234567',
        password: 'hashedPassword',
        role: 'Admin'
      }));
      expect(result).toEqual(expect.objectContaining({ username: 'Test User', role: 'Admin' }));
    });
  });

  describe('updateUser', () => {
    it('should hash password if provided during update', async () => {
      const mockSave = vi.fn();
      (User.findOne as any).mockResolvedValue({ _id: '123', role: 'Usuário', save: mockSave });

      await userService.updateUser('123', { password: 'newPassword' }, mockSuperAdmin);

      expect(argon2.hash).toHaveBeenCalledWith('newPassword');
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
