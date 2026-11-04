import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '50', 10),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@centinela.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
}));
