import { Injectable } from '@nestjs/common';

export interface IocRow {
  analysisId: string;
  analysisType: string;
  iocType: string;
  iocValue: string;
  riskLevel: string;
  createdAt: string;
}

@Injectable()
export class CsvService {
  private readonly HEADERS: (keyof IocRow)[] = [
    'analysisId',
    'analysisType',
    'iocType',
    'iocValue',
    'riskLevel',
    'createdAt',
  ];

  build(rows: IocRow[]): string {
    const lines = [this.HEADERS.join(',')];
    for (const row of rows) {
      lines.push(this.HEADERS.map((h) => csvCell(row[h])).join(','));
    }
    return lines.join('\r\n');
  }

  extractIocs(raw: RawAnalysis[]): IocRow[] {
    const rows: IocRow[] = [];

    for (const a of raw) {
      const base = {
        analysisId: a.id,
        analysisType: a.type,
        riskLevel: a.riskLevel ?? 'INCONCLUSIVE',
        createdAt: a.createdAt,
      };

      if (a.type === 'EMAIL' && a.emailAnalysis) {
        const e = a.emailAnalysis;
        if (e.fromAddress) rows.push({ ...base, iocType: 'email', iocValue: e.fromAddress });
        const urls: string[] = Array.isArray(e.urls) ? e.urls : [];
        for (const u of urls) rows.push({ ...base, iocType: 'url', iocValue: u });
        const attachments: { sha256?: string }[] = Array.isArray(e.attachments) ? e.attachments : [];
        for (const att of attachments) {
          if (att.sha256) rows.push({ ...base, iocType: 'sha256', iocValue: att.sha256 });
        }
      }

      if (a.type === 'FILE' && a.fileAnalysis) {
        const f = a.fileAnalysis;
        if (f.sha256) rows.push({ ...base, iocType: 'sha256', iocValue: f.sha256 });
        const indicators: { type?: string; description?: string }[] = Array.isArray(f.indicators) ? f.indicators : [];
        for (const ind of indicators) {
          if (ind.type && ind.description) rows.push({ ...base, iocType: ind.type, iocValue: ind.description });
        }
      }

      if (a.type === 'URL' && a.urlAnalysis) {
        const u = a.urlAnalysis;
        if (u.url) rows.push({ ...base, iocType: 'url', iocValue: u.url });
        if (u.domain) rows.push({ ...base, iocType: 'domain', iocValue: u.domain });
      }

      if (a.type === 'EMAIL_VERIFY' && a.emailVerify) {
        const ev = a.emailVerify;
        rows.push({ ...base, iocType: 'email', iocValue: ev.email });
        const domainResult = ev.domainResult as { domain?: string } | null;
        if (domainResult?.domain) rows.push({ ...base, iocType: 'domain', iocValue: domainResult.domain });
      }
    }

    return rows;
  }
}

function csvCell(value: string): string {
  const s = value ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface RawAnalysis {
  id: string;
  type: string;
  riskLevel: string | null;
  createdAt: string;
  emailAnalysis: { fromAddress: string | null; urls: unknown; attachments: unknown } | null;
  fileAnalysis: { sha256: string | null; indicators: unknown } | null;
  urlAnalysis: { url: string | null; domain: string | null } | null;
  emailVerify: { email: string; domainResult: unknown } | null;
}
