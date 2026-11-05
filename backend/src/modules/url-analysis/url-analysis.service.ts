import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpProbeService } from './http-probe.service';
import { checkUrl } from './ssrf.guard';
import { classifyUrlRisk } from './url-risk.engine';

@Injectable()
export class UrlAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly probe: HttpProbeService,
  ) {}

  async analyze(url: string): Promise<{ analysisId: string; status: string }> {
    // Pre-flight SSRF check before touching the DB
    const ssrfCheck = checkUrl(url);
    if (ssrfCheck.blocked) {
      // Still create a record so analysts can see the attempt
      const analysis = await this.prisma.analysis.create({
        data: {
          type: 'URL',
          status: 'COMPLETED',
          inputName: url,
          riskLevel: 'CRITICAL',
          riskExplanation: ssrfCheck.reason,
          completedAt: new Date(),
          urlAnalysis: {
            create: {
              url,
              domain: extractDomain(url),
              indicators: [{ type: 'SSRF_ATTEMPT', severity: 'CRITICAL', description: ssrfCheck.reason }] as object,
            },
          },
        },
      });
      return { analysisId: analysis.id, status: 'COMPLETED' };
    }

    const analysis = await this.prisma.analysis.create({
      data: {
        type: 'URL',
        status: 'PROCESSING',
        inputName: url,
        urlAnalysis: {
          create: {
            url,
            domain: extractDomain(url),
          },
        },
      },
    });

    this.runAnalysis(analysis.id, url).catch(async (err) => {
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'FAILED', riskLevel: 'INCONCLUSIVE', riskExplanation: String(err.message) },
      });
    });

    return { analysisId: analysis.id, status: 'PROCESSING' };
  }

  private async runAnalysis(analysisId: string, url: string) {
    const probeResult = await this.probe.probe(url);
    const risk = classifyUrlRisk(url, probeResult);

    let parsed: Record<string, string | null> = {};
    try {
      const u = new URL(url);
      parsed = { scheme: u.protocol, host: u.hostname, path: u.pathname, query: u.search || null };
    } catch { /* ignore */ }

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        riskLevel: risk.level as never,
        riskExplanation: risk.explanation,
        completedAt: new Date(),
        urlAnalysis: {
          update: {
            parsed: parsed as object,
            redirectChain: probeResult.redirectChain as object,
            tlsCert: probeResult.tls as object ?? undefined,
            indicators: risk.indicators as object,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { urlAnalysis: true },
    });

    if (!analysis || analysis.type !== 'URL') {
      throw new NotFoundException(`URL analysis ${id} not found`);
    }

    const ua = analysis.urlAnalysis;
    return {
      id: analysis.id,
      status: analysis.status,
      riskLevel: analysis.riskLevel,
      riskExplanation: analysis.riskExplanation,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      url: ua?.url ?? null,
      domain: ua?.domain ?? null,
      parsed: ua?.parsed ?? null,
      redirectChain: ua?.redirectChain ?? [],
      tls: ua?.tlsCert ?? null,
      indicators: ua?.indicators ?? [],
    };
  }
}

function extractDomain(url: string): string | null {
  try { return new URL(url).hostname; } catch { return null; }
}
