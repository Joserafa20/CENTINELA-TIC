import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { EmailAnalysisModule } from './modules/email/email-analysis.module';
import { FileAnalysisModule } from './modules/file/file-analysis.module';
import { EmailVerifyModule } from './modules/email-verify/email-verify.module';
import { UrlAnalysisModule } from './modules/url-analysis/url-analysis.module';
import { ThreatIntelModule } from './modules/threat-intel/threat-intel.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogModule } from './modules/audit/audit-log.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 10,   // max 10 req/s per IP
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 200,  // max 200 req/min per IP
      },
    ]),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    AnalysesModule,
    EmailAnalysisModule,
    FileAnalysisModule,
    EmailVerifyModule,
    UrlAnalysisModule,
    ThreatIntelModule,
    ReportsModule,
    AuditLogModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
