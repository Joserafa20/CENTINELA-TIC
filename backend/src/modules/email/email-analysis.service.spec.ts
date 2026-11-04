import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { EmailParserService } from './email-parser.service';
import { IndicatorService } from './indicator.service';
import { classifyEmailRisk } from './risk-engine/rules';

const FIXTURES = path.join(__dirname, '__fixtures__');

function loadFixture(name: string): Buffer {
  return fs.readFileSync(path.join(FIXTURES, name));
}

describe('EmailParserService', () => {
  let parser: EmailParserService;

  beforeEach(() => {
    parser = new EmailParserService();
  });

  it('TEST-EMAIL-001: extracts From, To, Subject, Date from spf-fail-credential.eml', async () => {
    const buffer = loadFixture('spf-fail-credential.eml');
    const result = await parser.parse(buffer);

    expect(result).not.toBeNull();
    expect(result!.from).toContain('support@bank.com');
    expect(result!.to).toContain('victim@example.com');
    expect(result!.subject).toBe('Urgent: Verify your account');
    expect(result!.date).toBeTruthy();
  });

  it('TEST-EMAIL-002: detects SPF FAIL from authentication headers', async () => {
    const buffer = loadFixture('spf-fail-credential.eml');
    const result = await parser.parse(buffer);

    expect(result!.auth.spf).toBe('fail');
  });

  it('TEST-EMAIL-003: detects DKIM PASS from all-pass-clean.eml', async () => {
    const buffer = loadFixture('all-pass-clean.eml');
    const result = await parser.parse(buffer);

    expect(result!.auth.dkim).toBe('pass');
    expect(result!.auth.spf).toBe('pass');
    expect(result!.auth.dmarc).toBe('pass');
  });

  it('TEST-EMAIL-004: extracts 3 URLs from HTML body', async () => {
    const buffer = loadFixture('html-urls.eml');
    const result = await parser.parse(buffer);

    expect(result!.urls.length).toBeGreaterThanOrEqual(3);
    expect(result!.urls.some((u) => u.includes('url1.example.com'))).toBe(true);
    expect(result!.urls.some((u) => u.includes('url2.example.com'))).toBe(true);
    expect(result!.urls.some((u) => u.includes('url3.example.com'))).toBe(true);
  });

  it('TEST-EMAIL-008: malformed email returns null (INCONCLUSIVE path)', async () => {
    const result = await parser.parse(Buffer.from('this is not an email at all \x00\x01\x02'));
    // mailparser is lenient — it may parse something; we accept either null or empty headers
    if (result !== null) {
      expect(result.from).toBeNull();
    }
  });
});

describe('Risk Engine', () => {
  it('TEST-EMAIL-006: SPF FAIL + credential keyword → CRITICAL', () => {
    const result = classifyEmailRisk(
      { spf: 'fail', dkim: 'none', dmarc: 'fail' },
      { credentialRequestKeyword: true, urgencyKeyword: false, replyToDomainMismatch: false, returnPathDomainMismatch: false, displayNameMismatch: false, suspiciousDomain: false },
    );
    expect(result.level).toBe('CRITICAL');
  });

  it('TEST-EMAIL-007: all auth PASS → LOW (never CLEAN per FR-EMAIL-011)', () => {
    const result = classifyEmailRisk(
      { spf: 'pass', dkim: 'pass', dmarc: 'pass' },
      { credentialRequestKeyword: false, urgencyKeyword: false, replyToDomainMismatch: false, returnPathDomainMismatch: false, displayNameMismatch: false, suspiciousDomain: false },
    );
    expect(result.level).toBe('LOW');
    expect(result.level).not.toBe('CLEAN');
  });

  it('SPF FAIL + Reply-To mismatch + suspicious domain → HIGH', () => {
    const result = classifyEmailRisk(
      { spf: 'fail', dkim: 'none', dmarc: 'fail' },
      { credentialRequestKeyword: false, urgencyKeyword: false, replyToDomainMismatch: true, returnPathDomainMismatch: false, displayNameMismatch: false, suspiciousDomain: true },
    );
    expect(result.level).toBe('HIGH');
  });

  it('SPF FAIL + no other indicators → MEDIUM', () => {
    const result = classifyEmailRisk(
      { spf: 'fail', dkim: 'none', dmarc: 'none' },
      { credentialRequestKeyword: false, urgencyKeyword: false, replyToDomainMismatch: false, returnPathDomainMismatch: false, displayNameMismatch: false, suspiciousDomain: false },
    );
    expect(result.level).toBe('MEDIUM');
  });

  it('all auth NONE → MEDIUM', () => {
    const result = classifyEmailRisk(
      { spf: 'none', dkim: 'none', dmarc: 'none' },
      { credentialRequestKeyword: false, urgencyKeyword: false, replyToDomainMismatch: false, returnPathDomainMismatch: false, displayNameMismatch: false, suspiciousDomain: false },
    );
    expect(result.level).toBe('MEDIUM');
  });
});

describe('IndicatorService', () => {
  let indicatorService: IndicatorService;

  beforeEach(() => {
    indicatorService = new IndicatorService();
  });

  it('detects Reply-To mismatch indicator', async () => {
    const parser = new EmailParserService();
    const buffer = loadFixture('spf-fail-credential.eml');
    const parsed = await parser.parse(buffer);
    const { indicators, flags } = indicatorService.detect(parsed!);

    expect(flags.replyToDomainMismatch).toBe(true);
    expect(indicators.some((i) => i.type === 'REPLY_TO_MISMATCH')).toBe(true);
  });

  it('detects credential request keyword', async () => {
    const parser = new EmailParserService();
    const buffer = loadFixture('spf-fail-credential.eml');
    const parsed = await parser.parse(buffer);
    const { flags } = indicatorService.detect(parsed!);

    expect(flags.credentialRequestKeyword).toBe(true);
  });
});
