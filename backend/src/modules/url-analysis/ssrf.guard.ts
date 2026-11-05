/**
 * SSRF prevention guard.
 * All inbound URLs are validated before any network request is made.
 * SEC-URL-001: Never connect to private, loopback, or link-local addresses.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost', 'ip6-localhost', 'ip6-loopback',
  'broadcasthost', 'ip6-allnodes', 'ip6-allrouters',
]);

const BLOCKED_TLD_PATTERNS = ['.local', '.internal', '.corp', '.lan', '.intranet', '.home'];

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

export interface SsrfCheckResult {
  blocked: boolean;
  reason?: string;
}

export function checkUrl(raw: string): SsrfCheckResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { blocked: true, reason: 'Invalid URL syntax' };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { blocked: true, reason: `Scheme "${url.protocol}" is not allowed. Only http and https are accepted.` };
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { blocked: true, reason: `Hostname "${host}" is blocked (loopback/internal)` };
  }

  for (const tld of BLOCKED_TLD_PATTERNS) {
    if (host.endsWith(tld)) {
      return { blocked: true, reason: `TLD "${tld}" is blocked (internal network)` };
    }
  }

  return { blocked: false };
}

export function checkResolvedIp(ip: string): SsrfCheckResult {
  if (isPrivateIp(ip)) {
    return { blocked: true, reason: `Resolved IP ${ip} is in a private/reserved range (SSRF prevention)` };
  }
  return { blocked: false };
}

function isPrivateIp(ip: string): boolean {
  // IPv4
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [, a, b, c] = v4.map(Number);
    return (
      a === 127 ||                                     // 127.0.0.0/8  loopback
      a === 10 ||                                      // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||             // 172.16.0.0/12
      (a === 192 && b === 168) ||                      // 192.168.0.0/16
      (a === 169 && b === 254) ||                      // 169.254.0.0/16 link-local
      (a === 0) ||                                     // 0.0.0.0/8
      (a === 100 && b >= 64 && b <= 127) ||            // 100.64.0.0/10 shared address space
      (a === 192 && b === 0 && c === 2) ||             // 192.0.2.0/24 TEST-NET
      (a === 198 && b >= 18 && b <= 19) ||             // 198.18.0.0/15 benchmark
      (a === 203 && b === 0 && c === 113) ||           // 203.0.113.0/24 TEST-NET-3
      (a === 240)                                      // 240.0.0.0/4 reserved
    );
  }

  // IPv6
  const lower = ip.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (lower === '::1') return true;                    // loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 ULA
  if (lower.startsWith('fe80')) return true;           // link-local
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

  return false;
}
