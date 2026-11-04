import type { DnsLookupResult } from './dns.service';

export type VerifyRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface VerifyRiskResult {
  level: VerifyRiskLevel;
  explanation: string;
}

export function classifyVerifyRisk(dns: DnsLookupResult): VerifyRiskResult {
  // DNS completely failed
  if (dns.error && !dns.domainExists && dns.mxRecords.length === 0) {
    return { level: 'INCONCLUSIVE', explanation: dns.error };
  }

  // Domain does not exist
  if (!dns.domainExists && dns.mxRecords.length === 0 && !dns.spfRecord && !dns.dmarcRecord) {
    return {
      level: 'CRITICAL',
      explanation: 'Domain does not exist. Any email from this address is likely forged.',
    };
  }

  // Domain exists but no MX — cannot receive email
  if (dns.mxRecords.length === 0) {
    return {
      level: 'HIGH',
      explanation: 'Domain exists but has no MX records. It cannot receive email and addresses may be used for spoofing.',
    };
  }

  // No SPF and no DMARC — fully spoofable
  if (!dns.spfRecord && !dns.dmarcRecord) {
    return {
      level: 'HIGH',
      explanation: 'No SPF or DMARC records found. This domain has no anti-spoofing protections and can be trivially impersonated.',
    };
  }

  // Has SPF but no DMARC — partial protection
  if (dns.spfRecord && !dns.dmarcRecord) {
    const spfStrength = getSPFStrength(dns.spfRecord);
    if (spfStrength === 'fail') {
      return {
        level: 'MEDIUM',
        explanation: 'SPF is configured with a hard fail (-all) but no DMARC policy. SPF alone does not protect against header-From spoofing.',
      };
    }
    return {
      level: 'MEDIUM',
      explanation: `SPF is configured (${spfStrength}) but no DMARC policy exists. Domain can still be spoofed via the header From address.`,
    };
  }

  // Has DMARC — check policy strength
  if (dns.dmarcRecord) {
    const policy = extractDmarcPolicy(dns.dmarcRecord);
    if (policy === 'none') {
      return {
        level: 'MEDIUM',
        explanation: 'DMARC policy is p=none (monitoring only). Spoofed emails will not be rejected or quarantined.',
      };
    }
    if (policy === 'quarantine') {
      return {
        level: 'LOW',
        explanation: 'DMARC policy is p=quarantine. Suspicious emails are sent to spam. SPF/DKIM configured.',
      };
    }
    if (policy === 'reject') {
      return {
        level: 'LOW',
        explanation: 'DMARC policy is p=reject. Spoofed emails are rejected outright. Strong configuration.',
      };
    }
  }

  return { level: 'INCONCLUSIVE', explanation: 'Could not determine risk from available DNS data.' };
}

function getSPFStrength(spf: string): 'fail' | 'softfail' | 'neutral' | 'pass' {
  if (spf.includes('-all')) return 'fail';
  if (spf.includes('~all')) return 'softfail';
  if (spf.includes('?all')) return 'neutral';
  return 'pass';
}

function extractDmarcPolicy(dmarc: string): string {
  const m = dmarc.match(/p=(\w+)/i);
  return m ? m[1].toLowerCase() : 'none';
}
