import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { CsvService } from './csv.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    private readonly csv: CsvService,
  ) {}

  async generatePdf(analysisId: string): Promise<Buffer> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        emailAnalysis: true,
        fileAnalysis: true,
        urlAnalysis: true,
        emailVerify: true,
      },
    });

    if (!analysis) throw new NotFoundException('Analysis not found');

    const details = this.buildDetails(analysis);
    const indicators = this.extractIndicators(analysis);

    const html = this.pdf.buildAnalysisHtml({
      id: analysis.id,
      type: analysis.type,
      riskLevel: analysis.riskLevel ?? null,
      riskExplanation: analysis.riskExplanation ?? null,
      createdAt: analysis.createdAt.toISOString(),
      details,
      indicators,
    });

    return this.pdf.generate(html);
  }

  async exportCsv(): Promise<string> {
    const analyses = await this.prisma.analysis.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        emailAnalysis: { select: { fromAddress: true, urls: true, attachments: true } },
        fileAnalysis: { select: { sha256: true, indicators: true } },
        urlAnalysis: { select: { url: true, domain: true } },
        emailVerify: { select: { email: true, domainResult: true } },
      },
    });

    const rows = this.csv.extractIocs(
      analyses.map((a) => ({
        id: a.id,
        type: a.type,
        riskLevel: a.riskLevel ?? null,
        createdAt: a.createdAt.toISOString(),
        emailAnalysis: a.emailAnalysis
          ? { fromAddress: a.emailAnalysis.fromAddress, urls: a.emailAnalysis.urls, attachments: a.emailAnalysis.attachments }
          : null,
        fileAnalysis: a.fileAnalysis
          ? { sha256: a.fileAnalysis.sha256, indicators: a.fileAnalysis.indicators }
          : null,
        urlAnalysis: a.urlAnalysis
          ? { url: a.urlAnalysis.url, domain: a.urlAnalysis.domain }
          : null,
        emailVerify: a.emailVerify
          ? { email: a.emailVerify.email, domainResult: a.emailVerify.domainResult }
          : null,
      })),
    );

    return this.csv.build(rows);
  }

  private buildDetails(analysis: any): { label: string; value: string | null }[] {
    const rows: { label: string; value: string | null }[] = [
      { label: 'Status', value: analysis.status },
      { label: 'Input', value: analysis.inputName },
    ];

    if (analysis.emailAnalysis) {
      const e = analysis.emailAnalysis;
      rows.push(
        { label: 'From', value: e.fromAddress },
        { label: 'Subject', value: e.subject },
        { label: 'SPF', value: e.spfResult },
        { label: 'DKIM', value: e.dkimResult },
        { label: 'DMARC', value: e.dmarcResult },
        { label: 'URLs found', value: String((e.urls as string[]).length) },
        { label: 'Attachments', value: String((e.attachments as unknown[]).length) },
      );
    }

    if (analysis.fileAnalysis) {
      const f = analysis.fileAnalysis;
      rows.push(
        { label: 'SHA-256', value: f.sha256 },
        { label: 'Detected type', value: f.detectedType },
        { label: 'Extension mismatch', value: f.extensionMismatch ? 'Yes' : 'No' },
        { label: 'File size', value: f.fileSize ? `${f.fileSize} bytes` : null },
      );
    }

    if (analysis.urlAnalysis) {
      const u = analysis.urlAnalysis;
      rows.push(
        { label: 'URL', value: u.url },
        { label: 'Domain', value: u.domain },
        { label: 'Redirects', value: String((u.redirectChain as unknown[]).length) },
      );
    }

    if (analysis.emailVerify) {
      const ev = analysis.emailVerify;
      const auth = ev.authentication as { spf?: { result?: string }; dmarc?: { policy?: string } } | null;
      rows.push(
        { label: 'Email', value: ev.email },
        { label: 'SPF', value: auth?.spf?.result ?? null },
        { label: 'DMARC policy', value: auth?.dmarc?.policy ?? null },
      );
    }

    return rows;
  }

  private extractIndicators(analysis: any): { type: string; description: string; severity: string }[] {
    const indicators: { type: string; description: string; severity: string }[] = [];

    const sources = [
      analysis.emailAnalysis?.indicators,
      analysis.fileAnalysis?.indicators,
      analysis.urlAnalysis?.indicators,
    ];

    for (const src of sources) {
      if (Array.isArray(src)) {
        for (const ind of src as { type?: string; description?: string; severity?: string }[]) {
          if (ind.type && ind.description) {
            indicators.push({ type: ind.type, description: ind.description, severity: ind.severity ?? 'MEDIUM' });
          }
        }
      }
    }

    return indicators;
  }
}
