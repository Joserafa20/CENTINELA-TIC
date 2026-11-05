import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource ?? null,
          resourceId: entry.resourceId ?? null,
          metadata: (entry.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      // Audit failures must never crash the main request
      this.logger.error('Failed to write audit log entry', err);
    }
  }
}
