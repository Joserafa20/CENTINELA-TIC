import { Injectable, Logger } from '@nestjs/common';

export type VtQueryType = 'hash' | 'url' | 'domain' | 'ip';

export interface VtResult {
  source: 'virustotal';
  queryType: VtQueryType;
  value: string;
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
  total: number;
  engines: { name: string; result: string }[];
  permalink: string | null;
  error?: string;
  skipped?: boolean;
}

const VT_BASE = 'https://www.virustotal.com/api/v3';
const TIMEOUT_MS = 15_000;

@Injectable()
export class VirusTotalClient {
  private readonly logger = new Logger(VirusTotalClient.name);
  private readonly apiKey: string | null;

  constructor() {
    this.apiKey = process.env.VIRUSTOTAL_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async lookup(type: VtQueryType, value: string): Promise<VtResult> {
    if (!this.apiKey) {
      return this.skipped(type, value, 'VIRUSTOTAL_API_KEY is not configured');
    }

    const path = this.buildPath(type, value);
    if (!path) return this.skipped(type, value, 'Unsupported query type');

    let data: Record<string, unknown>;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(`${VT_BASE}${path}`, {
        headers: { 'x-apikey': this.apiKey, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.status === 404) return this.empty(type, value);
      if (!res.ok) {
        const body = await res.text();
        return this.error(type, value, `VT API ${res.status}: ${body.slice(0, 200)}`);
      }
      data = await res.json() as Record<string, unknown>;
    } catch (err) {
      return this.error(type, value, (err as Error).message);
    }

    return this.parseResponse(type, value, data);
  }

  private buildPath(type: VtQueryType, value: string): string | null {
    switch (type) {
      case 'hash': return `/files/${encodeURIComponent(value)}`;
      case 'url': {
        // VT URL lookup uses base64url-encoded URL without padding
        const encoded = Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        return `/urls/${encoded}`;
      }
      case 'domain': return `/domains/${encodeURIComponent(value)}`;
      case 'ip': return `/ip_addresses/${encodeURIComponent(value)}`;
      default: return null;
    }
  }

  private parseResponse(type: VtQueryType, value: string, data: Record<string, unknown>): VtResult {
    const attrs = (data.data as Record<string, unknown>)?.attributes as Record<string, unknown> ?? {};
    const stats = attrs.last_analysis_stats as Record<string, number> ?? {};
    const results = attrs.last_analysis_results as Record<string, Record<string, string>> ?? {};
    const id = (data.data as Record<string, unknown>)?.id as string ?? null;

    const engines = Object.entries(results)
      .filter(([, v]) => v.category !== 'undetected' && v.category !== 'type-unsupported')
      .map(([name, v]) => ({ name, result: v.result ?? v.category }));

    const permalink = id ? `https://www.virustotal.com/gui/${this.guiPath(type)}/${id}` : null;

    return {
      source: 'virustotal',
      queryType: type,
      value,
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      undetected: stats.undetected ?? 0,
      harmless: stats.harmless ?? 0,
      total: Object.values(stats).reduce((s, n) => s + n, 0),
      engines,
      permalink,
    };
  }

  private guiPath(type: VtQueryType): string {
    return { hash: 'file', url: 'url', domain: 'domain', ip: 'ip-address' }[type] ?? type;
  }

  private empty(type: VtQueryType, value: string): VtResult {
    return { source: 'virustotal', queryType: type, value, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, total: 0, engines: [], permalink: null };
  }

  private error(type: VtQueryType, value: string, msg: string): VtResult {
    return { ...this.empty(type, value), error: msg };
  }

  private skipped(type: VtQueryType, value: string, msg: string): VtResult {
    return { ...this.empty(type, value), skipped: true, error: msg };
  }
}
