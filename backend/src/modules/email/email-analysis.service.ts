import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailParserService } from './email-parser.service';
import { IndicatorService } from './indicator.service';
import { classifyEmailRisk } from './risk-engine/rules';

@Injectable()
export class EmailAnalysisService {
  private readonly logger = new Logger(EmailAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: EmailParserService,
    private readonly indicator: IndicatorService,
  ) {}

  async analyze(file: Express.Multer.File): Promise<{ analysisId: string; status: string }> {
    // Create parent Analysis record (PROCESSING)
    const analysis = await this.prisma.analysis.create({
      data: {
        type: 'EMAIL',
        status: 'PROCESSING',
        inputName: file.originalname,
        inputHash: null,
      },
    });

    // Run analysis asynchronously — don't block the HTTP response
    this.runAnalysis(analysis.id, file.buffer, file.originalname).catch((err) => {
      this.logger.error(`Email analysis ${analysis.id} failed: ${(err as Error).message}`);
    });

    return { analysisId: analysis.id, status: 'PROCESSING' };
  }

  private async runAnalysis(analysisId: string, buffer: Buffer, filename: string): Promise<void> {
    const parsed = await this.parser.parse(buffer);

    if (!parsed) {
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          riskLevel: 'INCONCLUSIVE',
          riskExplanation: 'Email could not be parsed. File may be malformed or unsupported.',
          completedAt: new Date(),
          emailAnalysis: {
            create: { indicators: [], urls: [], attachments: [] },
          },
        },
      });
      return;
    }

    const { indicators, flags } = this.indicator.detect(parsed);
    const { level: riskLevel, explanation: riskExplanation } = classifyEmailRisk(parsed.auth, flags);

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        riskLevel,
        riskExplanation,
        inputName: filename,
        completedAt: new Date(),
        emailAnalysis: {
          create: {
            fromAddress: parsed.from,
            replyTo: parsed.replyTo,
            returnPath: parsed.returnPath,
            subject: parsed.subject,
            date: parsed.date,
            messageId: parsed.messageId,
            rawHeaders: parsed.rawHeaders as object,
            spfResult: parsed.auth.spf,
            dkimResult: parsed.auth.dkim,
            dmarcResult: parsed.auth.dmarc,
            urls: parsed.urls as object,
            attachments: parsed.attachments as object,
            indicators: indicators as object,
            bodyText: parsed.bodyText,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { emailAnalysis: true },
    });

    if (!analysis || analysis.type !== 'EMAIL') {
      throw new NotFoundException(`Email analysis ${id} not found`);
    }

    const ea = analysis.emailAnalysis;
    return {
      id: analysis.id,
      status: analysis.status,
      riskLevel: analysis.riskLevel,
      riskExplanation: analysis.riskExplanation,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      headers: ea
        ? {
            from: ea.fromAddress,
            replyTo: ea.replyTo,
            returnPath: ea.returnPath,
            subject: ea.subject,
            date: ea.date,
            messageId: ea.messageId,
            spf: ea.spfResult,
            dkim: ea.dkimResult,
            dmarc: ea.dmarcResult,
          }
        : null,
      urls: (ea?.urls as string[]) ?? [],
      attachments: ea?.attachments ?? [],
      indicators: ea?.indicators ?? [],
    };
  }
}
