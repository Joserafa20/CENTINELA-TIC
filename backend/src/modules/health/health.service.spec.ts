import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let queryRaw: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);

    (service as any).redis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };
  });

  it('returns ok when database and redis are healthy', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('ok');
    expect(result.services.redis).toBe('ok');
  });

  it('reports database error when query fails', async () => {
    queryRaw.mockRejectedValue(new Error('DB down'));
    const result = await service.check();
    expect(result.services.database).toBe('error');
  });

  it('reports redis error when ping fails', async () => {
    (service as any).redis.ping = vi.fn().mockRejectedValue(new Error('Redis down'));
    const result = await service.check();
    expect(result.services.redis).toBe('error');
  });
});
