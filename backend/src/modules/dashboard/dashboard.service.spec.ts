import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let count: ReturnType<typeof vi.fn>;
  let groupBy: ReturnType<typeof vi.fn>;
  let queryRaw: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    count = vi.fn().mockResolvedValue(0);
    groupBy = vi.fn().mockResolvedValue([]);
    queryRaw = vi.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            analysis: { count, groupBy },
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('returns zeroed stats when database is empty', async () => {
    const stats = await service.getStats();

    expect(stats.totals.analyses).toBe(0);
    expect(stats.totals.emails).toBe(0);
    expect(stats.totals.files).toBe(0);
    expect(stats.totals.domains).toBe(0);
    expect(stats.totals.urls).toBe(0);
    expect(stats.byRisk.CRITICAL).toBe(0);
    expect(stats.byRisk.CLEAN).toBe(0);
    expect(stats.activityLast30Days).toEqual([]);
  });

  it('maps type counts correctly', async () => {
    count.mockResolvedValue(3);
    groupBy.mockImplementation(({ by }: { by: string[] }) => {
      if (by[0] === 'type') {
        return Promise.resolve([
          { type: 'EMAIL', _count: { _all: 2 } },
          { type: 'FILE', _count: { _all: 1 } },
        ]);
      }
      return Promise.resolve([]);
    });

    const stats = await service.getStats();
    expect(stats.totals.analyses).toBe(3);
    expect(stats.totals.emails).toBe(2);
    expect(stats.totals.files).toBe(1);
    expect(stats.totals.urls).toBe(0);
  });

  it('maps risk level counts correctly', async () => {
    groupBy.mockImplementation(({ by }: { by: string[] }) => {
      if (by[0] === 'riskLevel') {
        return Promise.resolve([
          { riskLevel: 'CRITICAL', _count: { _all: 5 } },
          { riskLevel: 'HIGH', _count: { _all: 3 } },
        ]);
      }
      return Promise.resolve([]);
    });

    const stats = await service.getStats();
    expect(stats.byRisk.CRITICAL).toBe(5);
    expect(stats.byRisk.HIGH).toBe(3);
    expect(stats.byRisk.MEDIUM).toBe(0);
    expect(stats.byRisk.INCONCLUSIVE).toBe(0);
  });

  it('converts BigInt activity counts to Number', async () => {
    queryRaw.mockResolvedValue([{ date: '2026-11-04', count: BigInt(7) }]);

    const stats = await service.getStats();
    expect(stats.activityLast30Days[0].count).toBe(7);
    expect(typeof stats.activityLast30Days[0].count).toBe('number');
  });
});
