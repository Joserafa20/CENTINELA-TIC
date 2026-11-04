import { Injectable } from '@nestjs/common';
import { Resolver } from 'dns/promises';

export interface MxRecord { exchange: string; priority: number }
export interface DnsLookupResult {
  domainExists: boolean;
  mxRecords: MxRecord[];
  spfRecord: string | null;
  dmarcRecord: string | null;
  dkimRecords: { selector: string; record: string }[];
  error?: string;
}

// Common DKIM selectors to probe when none is provided
const DKIM_PROBE_SELECTORS = [
  'default', 'google', 'mail', 'dkim', 'k1', 'k2',
  'selector1', 'selector2', 'email', 'smtp',
];

@Injectable()
export class DnsService {
  private readonly resolver: Resolver;

  constructor() {
    this.resolver = new Resolver();
    this.resolver.setServers(['8.8.8.8', '1.1.1.1']);
  }

  async lookup(domain: string): Promise<DnsLookupResult> {
    const result: DnsLookupResult = {
      domainExists: false,
      mxRecords: [],
      spfRecord: null,
      dmarcRecord: null,
      dkimRecords: [],
    };

    // 1. Domain existence — check A or MX
    try {
      await this.resolver.resolve(domain, 'A');
      result.domainExists = true;
    } catch {
      try {
        await this.resolver.resolve(domain, 'AAAA');
        result.domainExists = true;
      } catch {
        // Domain may still have MX without A — check below
      }
    }

    // 2. MX records
    try {
      const mx = await this.resolver.resolveMx(domain);
      if (mx.length > 0) {
        result.domainExists = true;
        result.mxRecords = mx
          .sort((a, b) => a.priority - b.priority)
          .map((r) => ({ exchange: r.exchange, priority: r.priority }));
      }
    } catch { /* no MX — not fatal */ }

    // 3. SPF — TXT records on the domain
    try {
      const txts = await this.resolver.resolveTxt(domain);
      const spf = txts.flat().find((t) => t.startsWith('v=spf1'));
      if (spf) result.spfRecord = spf;
    } catch { /* no TXT */ }

    // 4. DMARC — TXT record at _dmarc.<domain>
    try {
      const txts = await this.resolver.resolveTxt(`_dmarc.${domain}`);
      const dmarc = txts.flat().find((t) => t.startsWith('v=DMARC1'));
      if (dmarc) result.dmarcRecord = dmarc;
    } catch { /* no DMARC */ }

    // 5. DKIM — probe common selectors
    const dkimChecks = DKIM_PROBE_SELECTORS.map(async (sel) => {
      try {
        const txts = await this.resolver.resolveTxt(`${sel}._domainkey.${domain}`);
        const record = txts.flat().join('');
        if (record.includes('v=DKIM1') || record.includes('p=')) {
          result.dkimRecords.push({ selector: sel, record: record.slice(0, 300) });
        }
      } catch { /* selector not found */ }
    });
    await Promise.allSettled(dkimChecks);

    if (!result.domainExists && result.mxRecords.length === 0 && !result.spfRecord && !result.dmarcRecord) {
      result.error = 'Domain could not be resolved — may not exist or DNS is unreachable';
    }

    return result;
  }
}
