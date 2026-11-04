import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
    });
  }

  async check() {
    const [db, redisStatus] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: db.status === 'fulfilled' ? 'ok' : 'error',
        redis: redisStatus.status === 'fulfilled' ? 'ok' : 'error',
      },
    };
  }

  private async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis() {
    const pong = await this.redis.ping();
    if (pong !== 'PONG') throw new Error('Redis PONG mismatch');
  }
}
