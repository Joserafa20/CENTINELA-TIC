import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ListAnalysesOptions {
  limit: number;
  page: number;
}

@Injectable()
export class AnalysesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(options: ListAnalysesOptions) {
    const { limit, page } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.analysis.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          inputName: true,
          riskLevel: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.analysis.count(),
    ]);

    return {
      data,
      meta: { total, page, limit },
    };
  }
}
