import { describe, it, expect } from 'vitest';
import { CsvService } from './csv.service';

const csv = new CsvService();

describe('CsvService.build', () => {
  it('emits a header row', () => {
    const result = csv.build([]);
    expect(result.startsWith('analysisId,analysisType')).toBe(true);
  });

  it('wraps values containing commas in double quotes', () => {
    const result = csv.build([
      {
        analysisId: 'abc',
        analysisType: 'URL',
        iocType: 'url',
        iocValue: 'http://example.com/path,extra',
        riskLevel: 'HIGH',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    expect(result).toContain('"http://example.com/path,extra"');
  });

  it('escapes double quotes inside cell values', () => {
    const result = csv.build([
      {
        analysisId: 'abc',
        analysisType: 'FILE',
        iocType: 'sha256',
        iocValue: 'value"with"quotes',
        riskLevel: 'LOW',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    expect(result).toContain('"value""with""quotes"');
  });
});

describe('CsvService.extractIocs', () => {
  it('extracts email fromAddress', () => {
    const rows = csv.extractIocs([
      {
        id: 'a1',
        type: 'EMAIL',
        riskLevel: 'HIGH',
        createdAt: '2025-01-01T00:00:00.000Z',
        emailAnalysis: { fromAddress: 'evil@bad.com', urls: [], attachments: [] },
        fileAnalysis: null,
        urlAnalysis: null,
        emailVerify: null,
      },
    ]);
    expect(rows).toContainEqual(expect.objectContaining({ iocType: 'email', iocValue: 'evil@bad.com' }));
  });

  it('extracts file SHA-256', () => {
    const rows = csv.extractIocs([
      {
        id: 'a2',
        type: 'FILE',
        riskLevel: 'CRITICAL',
        createdAt: '2025-01-01T00:00:00.000Z',
        emailAnalysis: null,
        fileAnalysis: { sha256: 'deadbeef'.repeat(8), indicators: [] },
        urlAnalysis: null,
        emailVerify: null,
      },
    ]);
    expect(rows).toContainEqual(expect.objectContaining({ iocType: 'sha256' }));
  });

  it('extracts URL and domain from URL analysis', () => {
    const rows = csv.extractIocs([
      {
        id: 'a3',
        type: 'URL',
        riskLevel: 'MEDIUM',
        createdAt: '2025-01-01T00:00:00.000Z',
        emailAnalysis: null,
        fileAnalysis: null,
        urlAnalysis: { url: 'https://evil.com', domain: 'evil.com' },
        emailVerify: null,
      },
    ]);
    expect(rows.some((r) => r.iocType === 'url')).toBe(true);
    expect(rows.some((r) => r.iocType === 'domain')).toBe(true);
  });

  it('extracts email from EMAIL_VERIFY analysis', () => {
    const rows = csv.extractIocs([
      {
        id: 'a4',
        type: 'EMAIL_VERIFY',
        riskLevel: 'LOW',
        createdAt: '2025-01-01T00:00:00.000Z',
        emailAnalysis: null,
        fileAnalysis: null,
        urlAnalysis: null,
        emailVerify: { email: 'test@domain.com', domainResult: { domain: 'domain.com' } },
      },
    ]);
    expect(rows).toContainEqual(expect.objectContaining({ iocType: 'email', iocValue: 'test@domain.com' }));
    expect(rows).toContainEqual(expect.objectContaining({ iocType: 'domain', iocValue: 'domain.com' }));
  });

  it('returns empty array for analysis with no related data', () => {
    const rows = csv.extractIocs([
      {
        id: 'a5',
        type: 'FILE',
        riskLevel: 'INCONCLUSIVE',
        createdAt: '2025-01-01T00:00:00.000Z',
        emailAnalysis: null,
        fileAnalysis: null,
        urlAnalysis: null,
        emailVerify: null,
      },
    ]);
    expect(rows).toHaveLength(0);
  });
});
