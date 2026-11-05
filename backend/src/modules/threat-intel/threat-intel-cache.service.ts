import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// TTL: malicious/suspicious results cached shorter (re-check sooner); clean cached longer
const TTL_MALICIOUS_SECONDS = 3600;    // 1 hour
const TTL_CLEAN_SECONDS    = 86400;    // 24 hours
const CACHE_VERSION        = 'v1';

@Injectable()
export class ThreatIntelCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThreatIntelCacheService.name);
  private client?: Redis;

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set — threat intel cache disabled');
      return;
    }
    this.client = new Redis(url, { lazyConnect: true, enableReadyCheck: false });
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(`Redis connect failed — cache disabled: ${(err as Error).message}`);
      this.client = undefined;
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => { /* ignore */ });
  }

  private key(type: string, value: string): string {
    return `threat-intel:${CACHE_VERSION}:${type}:${value.toLowerCase()}`;
  }

  async get<T>(type: string, value: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(this.key(type, value));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(type: string, value: string, data: unknown, isMalicious: boolean): Promise<void> {
    if (!this.client) return;
    const ttl = isMalicious ? TTL_MALICIOUS_SECONDS : TTL_CLEAN_SECONDS;
    try {
      await this.client.setex(this.key(type, value), ttl, JSON.stringify(data));
    } catch { /* cache failure is non-fatal */ }
  }
}
