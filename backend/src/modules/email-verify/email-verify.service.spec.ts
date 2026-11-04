import { describe, it, expect } from 'vitest';
import { classifyVerifyRisk } from './email-verify-risk.engine';
import type { DnsLookupResult } from './dns.service';

const base: DnsLookupResult = {
  domainExists: true,
  mxRecords: [{ exchange: 'mail.example.com', priority: 10 }],
  spfRecord: null,
  dmarcRecord: null,
  dkimRecords: [],
};

describe('classifyVerifyRisk', () => {
  it('returns INCONCLUSIVE when DNS completely fails', () => {
    const result = classifyVerifyRisk({
      domainExists: false,
      mxRecords: [],
      spfRecord: null,
      dmarcRecord: null,
      dkimRecords: [],
      error: 'DNS timeout',
    });
    expect(result.level).toBe('INCONCLUSIVE');
  });

  it('returns CRITICAL when domain does not exist', () => {
    const result = classifyVerifyRisk({
      domainExists: false,
      mxRecords: [],
      spfRecord: null,
      dmarcRecord: null,
      dkimRecords: [],
    });
    expect(result.level).toBe('CRITICAL');
  });

  it('returns HIGH when domain exists but has no MX records', () => {
    const result = classifyVerifyRisk({ ...base, mxRecords: [] });
    expect(result.level).toBe('HIGH');
  });

  it('returns HIGH when domain has MX but no SPF and no DMARC', () => {
    const result = classifyVerifyRisk(base);
    expect(result.level).toBe('HIGH');
    expect(result.explanation).toContain('SPF');
    expect(result.explanation).toContain('DMARC');
  });

  it('returns MEDIUM when only SPF is present without DMARC', () => {
    const result = classifyVerifyRisk({ ...base, spfRecord: 'v=spf1 include:_spf.google.com ~all' });
    expect(result.level).toBe('MEDIUM');
  });

  it('returns MEDIUM when DMARC policy is p=none', () => {
    const result = classifyVerifyRisk({
      ...base,
      spfRecord: 'v=spf1 -all',
      dmarcRecord: 'v=DMARC1; p=none; rua=mailto:dmarc@example.com',
    });
    expect(result.level).toBe('MEDIUM');
    expect(result.explanation).toContain('p=none');
  });

  it('returns LOW when DMARC policy is p=quarantine', () => {
    const result = classifyVerifyRisk({
      ...base,
      spfRecord: 'v=spf1 -all',
      dmarcRecord: 'v=DMARC1; p=quarantine',
    });
    expect(result.level).toBe('LOW');
  });

  it('returns LOW when DMARC policy is p=reject', () => {
    const result = classifyVerifyRisk({
      ...base,
      spfRecord: 'v=spf1 -all',
      dmarcRecord: 'v=DMARC1; p=reject',
    });
    expect(result.level).toBe('LOW');
  });

  it('never returns CLEAN', () => {
    const result = classifyVerifyRisk({
      ...base,
      spfRecord: 'v=spf1 -all',
      dmarcRecord: 'v=DMARC1; p=reject',
    });
    expect(result.level).not.toBe('CLEAN');
  });
});
