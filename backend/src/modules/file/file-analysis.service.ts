import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MagicBytesService } from './magic-bytes.service';
import { classifyFileRisk, type FileRiskInput } from './file-risk-engine';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/tmp/centinela/uploads';

@Injectable()
export class FileAnalysisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileAnalysisService.name);
  private queueEvents?: QueueEvents;

  constructor(
    @InjectQueue('file-analysis') private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly magic: MagicBytesService,
  ) {}

  async onModuleInit() {
    // Ensure upload directory exists (local dev — in Docker it's a volume)
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Listen for scanner job results
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.queueEvents = new QueueEvents('file-analysis', {
        connection: { url: redisUrl },
      });
      this.queueEvents.on('completed', async ({ returnvalue }) => {
        try {
          const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
          if (result?.analysisId) await this.applyResult(result);
        } catch (err) {
          this.logger.error(`Failed to apply scanner result: ${(err as Error).message}`);
        }
      });
      this.queueEvents.on('failed', async ({ jobId }) => {
        this.logger.warn(`Scanner job ${jobId} failed — marking INCONCLUSIVE`);
      });
    }
  }

  async onModuleDestroy() {
    await this.queueEvents?.close();
  }

  async analyze(file: Express.Multer.File, password?: string): Promise<{ analysisId: string; status: string }> {
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const storedName = `${sha256}${ext}`;
    const storedPath = path.join(UPLOAD_DIR, storedName);

    // Store file (SEC-FILE-007: SHA-256-named, outside web root)
    fs.writeFileSync(storedPath, file.buffer);

    const magicResult = this.magic.detect(file.buffer, file.originalname);

    const analysis = await this.prisma.analysis.create({
      data: {
        type: 'FILE',
        status: 'PROCESSING',
        inputName: file.originalname,
        inputHash: sha256,
        fileAnalysis: {
          create: {
            sha256,
            detectedType: magicResult.detectedMime,
            declaredExt: ext,
            extensionMismatch: magicResult.extensionMismatch,
            fileSize: file.size,
          },
        },
      },
    });

    // Dispatch to scanner container (SEC-FILE-006: password never stored in DB)
    await this.queue.add(
      'analyze-file',
      {
        analysisId: analysis.id,
        filePath: storedPath,
        fileName: file.originalname,
        sha256,
        // Password is passed to scanner but NOT stored in DB
        ...(password ? { password } : {}),
      },
      {
        attempts: 1,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    );

    return { analysisId: analysis.id, status: 'PROCESSING' };
  }

  private async applyResult(result: Record<string, unknown>) {
    const { analysisId, riskLevel, riskExplanation, clamav, yara, structuralFindings, indicators } = result as {
      analysisId: string;
      riskLevel: string;
      riskExplanation: string;
      extensionMismatch: boolean;
      clamav: { result: string; signature?: string };
      yara: { matches: unknown[] };
      structuralFindings: unknown[];
      indicators: unknown[];
    };

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        riskLevel: riskLevel as never,
        riskExplanation,
        completedAt: new Date(),
        fileAnalysis: {
          update: {
            clamResult: clamav as object,
            yaraMatches: (yara as { matches: unknown[] }).matches as object,
            structuralFindings: structuralFindings as object,
            indicators: indicators as object,
          },
        },
      },
    });

    // Clean up uploaded file (SEC-FILE-007)
    const analysis = await this.prisma.analysis.findUnique({ where: { id: analysisId } });
    if (analysis?.inputHash) {
      const files = fs.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(analysis.inputHash!));
      for (const f of files) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* already gone */ }
      }
    }
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { fileAnalysis: true },
    });

    if (!analysis || analysis.type !== 'FILE') {
      throw new NotFoundException(`File analysis ${id} not found`);
    }

    const fa = analysis.fileAnalysis;
    return {
      id: analysis.id,
      status: analysis.status,
      riskLevel: analysis.riskLevel,
      riskExplanation: analysis.riskExplanation,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      file: fa
        ? {
            originalName: analysis.inputName,
            sha256: fa.sha256,
            detectedType: fa.detectedType,
            declaredExtension: fa.declaredExt,
            extensionMismatch: fa.extensionMismatch,
            size: fa.fileSize,
          }
        : null,
      clamav: fa?.clamResult ?? null,
      yara: fa?.yaraMatches ?? [],
      metadata: fa?.metadata ?? null,
      structuralFindings: fa?.structuralFindings ?? [],
      indicators: fa?.indicators ?? [],
    };
  }
}
