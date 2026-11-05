import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generate(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  buildAnalysisHtml(data: AnalysisReportData): string {
    const riskColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#2563eb',
      INCONCLUSIVE: '#6b7280',
      CLEAN: '#16a34a',
    };

    const riskColor = riskColors[data.riskLevel ?? 'INCONCLUSIVE'] ?? '#6b7280';

    const rows = data.details
      .map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.value ?? '—')}</td></tr>`)
      .join('');

    const indicators = data.indicators.length
      ? `<h3>Indicators</h3><table><thead><tr><th>Type</th><th>Description</th><th>Severity</th></tr></thead><tbody>
         ${data.indicators.map((i) => `<tr><td>${esc(i.type)}</td><td>${esc(i.description)}</td><td>${esc(i.severity)}</td></tr>`).join('')}
         </tbody></table>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; }
  header { background: #0f172a; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  header h1 { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
  header small { font-size: 10px; opacity: .7; }
  .risk-badge { display: inline-block; background: ${riskColor}; color: #fff; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 13px; margin: 16px 0 8px; }
  .explanation { font-size: 11px; color: #555; margin-bottom: 16px; }
  section { margin: 16px 0; }
  h2 { font-size: 13px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; color: #0f172a; }
  h3 { font-size: 12px; font-weight: 700; margin: 12px 0 6px; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-weight: 600; color: #334155; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
  footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>CENTINELA TIC — Analysis Report</h1>
  <small>Generated ${new Date().toISOString()}</small>
</header>
<div style="padding:20px 24px">
  <section>
    <h2>Analysis Summary</h2>
    <p class="meta">ID: ${esc(data.id)} &nbsp;|&nbsp; Type: ${esc(data.type)} &nbsp;|&nbsp; Created: ${esc(data.createdAt)}</p>
    <span class="risk-badge">${esc(data.riskLevel ?? 'INCONCLUSIVE')}</span>
    ${data.riskExplanation ? `<p class="explanation">${esc(data.riskExplanation)}</p>` : ''}
  </section>
  <section>
    <h2>Details</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
  </section>
  ${indicators ? `<section>${indicators}</section>` : ''}
  <footer>CENTINELA TIC &mdash; Internal Use Only &mdash; Do not distribute without authorization</footer>
</div>
</body>
</html>`;
  }
}

function esc(s: string | number | null | undefined): string {
  if (s == null) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AnalysisReportData {
  id: string;
  type: string;
  riskLevel: string | null;
  riskExplanation: string | null;
  createdAt: string;
  details: { label: string; value: string | null }[];
  indicators: { type: string; description: string; severity: string }[];
}
