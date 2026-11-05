import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { Resolver } from 'dns/promises';
import { checkResolvedIp } from './ssrf.guard';

export interface RedirectHop {
  url: string;
  status: number;
  ip: string | null;
  tls: TlsInfo | null;
}

export interface TlsInfo {
  subject: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  expired: boolean;
  selfSigned: boolean;
  san: string[];
}

export interface ProbeResult {
  finalUrl: string;
  finalStatus: number;
  redirectChain: RedirectHop[];
  tls: TlsInfo | null;
  error?: string;
  ssrfBlocked?: string;
}

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const UA = 'CENTINELA-TIC-Scanner/1.0 (security-analysis; local-only)';

@Injectable()
export class HttpProbeService {
  private readonly logger = new Logger(HttpProbeService.name);
  private readonly resolver = new Resolver();

  constructor() {
    this.resolver.setServers(['8.8.8.8', '1.1.1.1']);
  }

  async probe(startUrl: string): Promise<ProbeResult> {
    const chain: RedirectHop[] = [];
    let currentUrl = startUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        return { finalUrl: currentUrl, finalStatus: 0, redirectChain: chain, tls: null, error: 'Invalid URL in redirect chain' };
      }

      // Resolve IP and check SSRF before connecting
      let resolvedIp: string | null = null;
      try {
        const ips = await this.resolver.resolve4(parsed.hostname).catch(async () =>
          this.resolver.resolve6(parsed.hostname),
        );
        resolvedIp = ips[0] ?? null;
      } catch {
        return { finalUrl: currentUrl, finalStatus: 0, redirectChain: chain, tls: null, error: `DNS resolution failed for ${parsed.hostname}` };
      }

      if (resolvedIp) {
        const ssrfCheck = checkResolvedIp(resolvedIp);
        if (ssrfCheck.blocked) {
          return {
            finalUrl: currentUrl,
            finalStatus: 0,
            redirectChain: chain,
            tls: null,
            ssrfBlocked: ssrfCheck.reason,
          };
        }
      }

      // Make HEAD request (fall back to GET if 405)
      let result: { status: number; location: string | null; tls: TlsInfo | null };
      try {
        result = await this.makeRequest(parsed, resolvedIp);
      } catch (err) {
        return {
          finalUrl: currentUrl,
          finalStatus: 0,
          redirectChain: chain,
          tls: null,
          error: (err as Error).message.slice(0, 200),
        };
      }

      const hop_entry: RedirectHop = {
        url: currentUrl,
        status: result.status,
        ip: resolvedIp,
        tls: result.tls,
      };
      chain.push(hop_entry);

      if (result.status >= 300 && result.status < 400 && result.location) {
        // Resolve relative redirect
        try {
          currentUrl = new URL(result.location, currentUrl).toString();
        } catch {
          break;
        }
        continue;
      }

      return {
        finalUrl: currentUrl,
        finalStatus: result.status,
        redirectChain: chain,
        tls: result.tls,
      };
    }

    return {
      finalUrl: currentUrl,
      finalStatus: 0,
      redirectChain: chain,
      tls: null,
      error: `Exceeded maximum redirect limit (${MAX_REDIRECTS})`,
    };
  }

  private makeRequest(
    url: URL,
    resolvedIp: string | null,
  ): Promise<{ status: number; location: string | null; tls: TlsInfo | null }> {
    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options: https.RequestOptions = {
        method: 'HEAD',
        hostname: resolvedIp ?? url.hostname,
        host: resolvedIp ?? url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        headers: { Host: url.hostname, 'User-Agent': UA },
        timeout: TIMEOUT_MS,
        // We handle redirects manually — never follow automatically
        ...(isHttps ? {
          rejectUnauthorized: false, // We capture cert errors as indicators
          servername: url.hostname,
        } : {}),
      };

      const req = lib.request(options, (res) => {
        let tls: TlsInfo | null = null;
        // Extract TLS certificate from the socket
        if (isHttps) {
          const socket = res.socket as import('tls').TLSSocket;
          if (typeof socket.getPeerCertificate === 'function') {
            const cert = socket.getPeerCertificate(true);
            if (cert && Object.keys(cert).length > 0) {
              const now = Date.now();
              const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
              const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
              const issuerRaw = cert.issuer?.CN ?? cert.issuer?.O ?? null;
              const issuerCN = Array.isArray(issuerRaw) ? issuerRaw[0] ?? null : issuerRaw;
              const subjectRaw = cert.subject?.CN ?? null;
              const subjectCN = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
              tls = {
                subject: subjectCN,
                issuer: issuerCN,
                validFrom: validFrom?.toISOString() ?? null,
                validTo: validTo?.toISOString() ?? null,
                expired: validTo ? now > validTo.getTime() : false,
                selfSigned: issuerCN === subjectCN,
                san: (cert.subjectaltname ?? '').split(', ').filter((s) => s.startsWith('DNS:')).map((s) => s.slice(4)),
              };
            }
          }
        }
        // Drain response body (HEAD has none, but safety)
        res.resume();
        resolve({
          status: res.statusCode ?? 0,
          location: res.headers.location ?? null,
          tls,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
      });

      req.on('error', (err) => reject(err));
      req.end();
    });
  }
}
