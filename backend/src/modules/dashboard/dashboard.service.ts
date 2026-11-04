import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisType, RiskLevel } from '@prisma/client';

export interface DashboardStats {
  totals: {
    analyses: number;
    emails: number;
    files: number;
    domains: number;
    urls: number;
  };
  byRisk: Record<RiskLevel, number>;
  activityLast30Days: { date: string; count: number }[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [totalAnalyses, byType, byRisk, activityRaw] = await Promise.all([
      this.prisma.analysis.count(),
      this.prisma.analysis.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.analysis.groupBy({ by: ['riskLevel'], _count: { _all: true } }),
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*) AS count
        FROM "Analysis"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date ASC
      `,
    ]);

    const typeMap = Object.fromEntries(
      byType.map((r) => [r.type, r._count._all]),
    ) as Partial<Record<AnalysisType, number>>;

    const riskMap = Object.fromEntries(
      byRisk.map((r) => [r.riskLevel, r._count._all]),
    ) as Partial<Record<RiskLevel, number>>;

    const allRiskLevels: RiskLevel[] = [
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW',
      'CLEAN',
      'INCONCLUSIVE',
    ];

    return {
      totals: {
        analyses: totalAnalyses,
        emails: typeMap[AnalysisType.EMAIL] ?? 0,
        files: typeMap[AnalysisType.FILE] ?? 0,
        domains: typeMap[AnalysisType.EMAIL_VERIFY] ?? 0,
        urls: typeMap[AnalysisType.URL] ?? 0,
      },
      byRisk: Object.fromEntries(
        allRiskLevels.map((level) => [level, riskMap[level] ?? 0]),
      ) as Record<RiskLevel, number>,
      activityLast30Days: activityRaw.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    };
  }
}
