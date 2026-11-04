import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-uuid-001',
  email: 'admin@centinela.local',
  passwordHash: '',
  role: 'ADMIN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userFindUnique: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('correct-password', 10);
  });

  beforeEach(async () => {
    userFindUnique = vi.fn();

    const prismaMock = {
      user: { findUnique: userFindUnique, create: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('mock.jwt.token') } },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'app.adminEmail') return '';
              if (key === 'app.adminPassword') return '';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('returns user on valid credentials', async () => {
      userFindUnique.mockResolvedValue(mockUser);
      const result = await service.login({
        email: 'admin@centinela.local',
        password: 'correct-password',
      });
      expect(result.user.email).toBe('admin@centinela.local');
      expect(result.user.role).toBe('ADMIN');
    });

    it('throws UnauthorizedException when user not found', async () => {
      userFindUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      userFindUnique.mockResolvedValue(mockUser);
      await expect(
        service.login({ email: 'admin@centinela.local', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signToken', () => {
    it('returns a token string', () => {
      const token = service.signToken({ sub: 'user-uuid-001', email: 'admin@centinela.local', role: 'ADMIN' });
      expect(typeof token).toBe('string');
    });
  });
});
