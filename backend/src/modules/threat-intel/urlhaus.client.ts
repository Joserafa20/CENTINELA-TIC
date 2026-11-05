import { Injectable, Logger } from '@nestjs/common';

export type UhQueryType = 'hash' | 'url' | 'host';

export interface UrlhausResult {
  source: 'urlhaus';
  queryType: UhQueryType;
  value: string;
  status: 'malware' | 'clean' | 'no_results' | 'error';
  urlCount: number;
  urls: { url: string; urlStatus: string; threat: string; tags: string[] }[];
  permalink: string | null;
  error?: string;
}

const UH_BASE = 'https://urlhaus-api.abuse.ch/v1';
const TIMEOUT_MS = 10_000;

@Injectable()
export class UrlhausClient {
  private readonly logger = new Logger(UrlhausClient.name);

  async lookup(type: UhQueryType, value: string): Promise<UrlhausResult> {
    const { endpoint, body } = this.buildRequest(type, value);

    let data: Record<string, unknown>;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(`${UH_BASE}/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        return this.error(type, value, `URLhaus API ${res.status}`);
      }
      data = await res.json() as Record<string, unknown>;
    } catch (err) {
      return this.error(type, value, (err as Error).message);
    }

    return this.parseResponse(type, value, data);
  }

  private buildRequest(type: UhQueryType, value: string): { endpoint: string; body: Record<string, string> } {
    switch (type) {
      case 'url':
        return { endpoint: 'url', body: { url: value } };
      case 'host':
        return { endpoint: 'host', body: { host: value } };
      case 'hash':
        return { endpoint: value.length === 32 ? 'payload' : 'payload', body: value.length === 32 ? { md5_hash: value } : { sha256_hash: value } };
    }
  }

  private parseResponse(type: UhQueryType, value: string, data: Record<string, unknown>): UrlhausResult {
    const qStatus = data.query_status as string ?? '';

    if (qStatus === 'no_results' || qStatus === 'invalid_url' || qStatus === 'invalid_host') {
      return { source: 'urlhaus', queryType: type, value, status: 'no_results', urlCount: 0, urls: [], permalink: null };
    }

    if (qStatus === 'is_malware' || qStatus === 'ok') {
      const rawUrls = Array.isArray(data.urls) ? data.urls as Record<string, unknown>[] : [];
      const urls = rawUrls.slice(0, 10).map((u) => ({
        url: String(u.url ?? ''),
        urlStatus: String(u.url_status ?? ''),
        threat: String(u.threat ?? ''),
        tags: Array.isArray(u.tags) ? (u.tags as string[]) : [],
      }));

      const permalink = type === 'url' ? (data.urlhaus_reference as string ?? null) :
        type === 'host' ? (data.urlhaus_reference as string ?? null) :
        (data.urlhaus_download_url as string ?? null);

      const isActive = urls.some((u) => u.urlStatus === 'online');
      return {
        source: 'urlhaus',
        queryType: type,
        value,
        status: isActive ? 'malware' : 'malware',
        urlCount: (data.urls_count as number) ?? urls.length,
        urls,
        permalink,
      };
    }

    if (qStatus === 'is_clean' || qStatus === 'offline') {
      return { source: 'urlhaus', queryType: type, value, status: 'clean', urlCount: 0, urls: [], permalink: null };
    }

    return this.error(type, value, `Unexpected URLhaus status: ${qStatus}`);
  }

  private error(type: UhQueryType, value: string, msg: string): UrlhausResult {
    return { source: 'urlhaus', queryType: type, value, status: 'error', urlCount: 0, urls: [], permalink: null, error: msg };
  }
}
