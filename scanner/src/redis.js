import Redis from 'ioredis';

export function createConnection() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
