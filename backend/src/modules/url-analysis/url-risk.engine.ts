import type { ProbeResult } from './http-probe.service';

export type UrlRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface UrlRiskResult {
  level: UrlRiskLevel;
  explanation: string;
  indicators: { type: string; severity: string; description: string }[];
}

const SUSPICIOUS_TLDS = new Set([
  '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.pw',
  '.click', '.download', '.zip', '.review', '.country',
]);

export function classifyUrlRisk(
  originalUrl: string,
  probe: ProbeResult,
): UrlRiskResult {
  const indicators: { type: string; severity: string; description: string }[] = [];

  // DNS / connection failure
  if (probe.error && probe.redirectChain.length === 0) {
    return { level: 'INCONCLUSIVE', explanation: probe.error, indicators };
  }

  // SSRF attempt — highest priority
  if (probe.ssrfBlocked) {
    indicators.push({ type: 'SSRF_ATTEMPT', severity: 'CRITICAL', description: probe.ssrfBlocked });
    return { level: 'CRITICAL', explanation: probe.ssrfBlocked, indicators };
  }

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return { level: 'INCONCLUSIVE', explanation: 'Could not parse URL', indicators };
  }

  // IP address URL (no domain name)
  const isIpUrl = /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname) || parsed.hostname.startsWith('[');
  if (isIpUrl) {
    indicators.push({ type: 'IP_ADDRESS_URL', severity: 'HIGH', description: 'URL uses a raw IP address instead of a domain name' });
  }

  // TLS issues
  const finalHop = probe.redirectChain[probe.redirectChain.length - 1];
  const tls = probe.tls ?? finalHop?.tls ?? null;
  if (parsed.protocol === 'https:' && tls) {
    if (tls.expired) {
      indicators.push({ type: 'TLS_EXPIRED', severity: 'HIGH', description: `TLS certificate expired on ${tls.validTo}` });
    }
    if (tls.selfSigned) {
      indicators.push({ type: 'TLS_SELF_SIGNED', severity: 'HIGH', description: 'TLS certificate is self-signed' });
    }
  }

  // Cross-domain redirect (possible hijack)
  const originalDomain = parsed.hostname;
  const crossDomainRedirects = probe.redirectChain
    .slice(1)
    .filter((hop) => {
      try {
        const h = new URL(hop.url).hostname;
        return h !== originalDomain && !h.endsWith(`.${originalDomain}`);
      } catch { return false; }
    });
  if (crossDomainRedirects.length > 0) {
    indicators.push({
      type: 'CROSS_DOMAIN_REDIRECT',
      severity: 'MEDIUM',
      description: `URL redirects to a different domain: ${crossDomainRedirects.map((h) => { try { return new URL(h.url).hostname; } catch { return h.url; } }).join(', ')}`,
    });
  }

  // Excessive redirects
  if (probe.redirectChain.length > 3) {
    indicators.push({ type: 'EXCESSIVE_REDIRECTS', severity: 'MEDIUM', description: `${probe.redirectChain.length} redirect hops observed` });
  }

  // Suspicious TLD
  const tld = '.' + (originalDomain.split('.').pop() ?? '');
  if (SUSPICIOUS_TLDS.has(tld)) {
    indicators.push({ type: 'SUSPICIOUS_TLD', severity: 'MEDIUM', description: `Domain uses a TLD commonly associated with abuse: ${tld}` });
  }

  // Downgrade: redirect from HTTPS to HTTP
  const downgrades = probe.redirectChain.filter((hop, i) => {
    if (i === 0) return false;
    const prev = probe.redirectChain[i - 1];
    return prev.url.startsWith('https://') && hop.url.startsWith('http://');
  });
  if (downgrades.length > 0) {
    indicators.push({ type: 'HTTPS_DOWNGRADE', severity: 'MEDIUM', description: 'Redirect chain downgrades from HTTPS to HTTP' });
  }

  // Determine risk level from collected indicators
  const criticalCount = indicators.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = indicators.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = indicators.filter((i) => i.severity === 'MEDIUM').length;

  if (criticalCount > 0) {
    return { level: 'CRITICAL', explanation: indicators.find((i) => i.severity === 'CRITICAL')!.description, indicators };
  }
  if (highCount > 0) {
    return { level: 'HIGH', explanation: indicators.find((i) => i.severity === 'HIGH')!.description, indicators };
  }
  if (mediumCount > 0) {
    return { level: 'MEDIUM', explanation: indicators.find((i) => i.severity === 'MEDIUM')!.description, indicators };
  }

  // Reachable, no indicators
  return {
    level: 'LOW',
    explanation: 'No suspicious indicators detected. URL resolves cleanly with no redirect anomalies or TLS issues. Classification is LOW — absence of detections does not confirm safety.',
    indicators,
  };
}
