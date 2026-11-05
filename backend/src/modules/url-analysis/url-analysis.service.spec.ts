import { describe, it, expect } from 'vitest';
import { checkUrl, checkResolvedIp } from './ssrf.guard';
import { classifyUrlRisk } from './url-risk.engine';
import type { ProbeResult } from './http-probe.service';

// ── SSRF Guard ──────────────────────────────────────────────────────────────

describe('checkUrl', () => {
  it('blocks file:// scheme', () => {
    expect(checkUrl('file:///etc/passwd').blocked).toBe(true);
  });

  it('blocks ftp:// scheme', () => {
    expect(checkUrl('ftp://example.com').blocked).toBe(true);
  });

  it('blocks localhost', () => {
    expect(checkUrl('http://localhost/admin').blocked).toBe(true);
  });

  it('blocks .local TLD', () => {
    expect(checkUrl('http://printer.local').blocked).toBe(true);
  });

  it('allows https://example.com', () => {
    expect(checkUrl('https://example.com').blocked).toBe(false);
  });

  it('blocks invalid URL syntax', () => {
    expect(checkUrl('not a url').blocked).toBe(true);
  });
});

describe('checkResolvedIp', () => {
  it('blocks 127.0.0.1', () => expect(checkResolvedIp('127.0.0.1').blocked).toBe(true));
  it('blocks 10.0.0.1', () => expect(checkResolvedIp('10.0.0.1').blocked).toBe(true));
  it('blocks 192.168.1.1', () => expect(checkResolvedIp('192.168.1.1').blocked).toBe(true));
  it('blocks 172.16.0.1', () => expect(checkResolvedIp('172.16.0.1').blocked).toBe(true));
  it('blocks 169.254.1.1 link-local', () => expect(checkResolvedIp('169.254.1.1').blocked).toBe(true));
  it('blocks ::1 IPv6 loopback', () => expect(checkResolvedIp('::1').blocked).toBe(true));
  it('allows 1.1.1.1 (Cloudflare)', () => expect(checkResolvedIp('1.1.1.1').blocked).toBe(false));
  it('allows 8.8.8.8 (Google DNS)', () => expect(checkResolvedIp('8.8.8.8').blocked).toBe(false));
});

// ── URL Risk Engine ─────────────────────────────────────────────────────────

const cleanProbe: ProbeResult = {
  finalUrl: 'https://example.com',
  finalStatus: 200,
  redirectChain: [{ url: 'https://example.com', status: 200, ip: '93.184.216.34', tls: null }],
  tls: null,
};

describe('classifyUrlRisk', () => {
  it('returns CRITICAL for SSRF-blocked probe', () => {
    const result = classifyUrlRisk('http://192.168.1.1', {
      ...cleanProbe,
      ssrfBlocked: 'Resolved IP 192.168.1.1 is in a private range',
      redirectChain: [],
    });
    expect(result.level).toBe('CRITICAL');
  });

  it('returns INCONCLUSIVE when DNS fails and no chain', () => {
    const result = classifyUrlRisk('https://nonexistent.example', {
      finalUrl: 'https://nonexistent.example',
      finalStatus: 0,
      redirectChain: [],
      tls: null,
      error: 'DNS resolution failed',
    });
    expect(result.level).toBe('INCONCLUSIVE');
  });

  it('returns HIGH for IP-address URL', () => {
    const result = classifyUrlRisk('http://93.184.216.34', {
      ...cleanProbe,
      redirectChain: [{ url: 'http://93.184.216.34', status: 200, ip: '93.184.216.34', tls: null }],
    });
    expect(result.level).toBe('HIGH');
    expect(result.indicators.some((i) => i.type === 'IP_ADDRESS_URL')).toBe(true);
  });

  it('returns HIGH for expired TLS certificate', () => {
    const result = classifyUrlRisk('https://example.com', {
      ...cleanProbe,
      tls: { subject: 'example.com', issuer: 'CA', validFrom: '2020-01-01T00:00:00Z', validTo: '2021-01-01T00:00:00Z', expired: true, selfSigned: false, san: [] },
    });
    expect(result.level).toBe('HIGH');
    expect(result.indicators.some((i) => i.type === 'TLS_EXPIRED')).toBe(true);
  });

  it('returns MEDIUM for cross-domain redirect', () => {
    const result = classifyUrlRisk('https://example.com', {
      finalUrl: 'https://evil.com',
      finalStatus: 200,
      redirectChain: [
        { url: 'https://example.com', status: 301, ip: '1.2.3.4', tls: null },
        { url: 'https://evil.com', status: 200, ip: '5.6.7.8', tls: null },
      ],
      tls: null,
    });
    expect(result.level).toBe('MEDIUM');
    expect(result.indicators.some((i) => i.type === 'CROSS_DOMAIN_REDIRECT')).toBe(true);
  });

  it('returns LOW for clean reachable URL', () => {
    const result = classifyUrlRisk('https://example.com', cleanProbe);
    expect(result.level).toBe('LOW');
    expect(result.indicators).toHaveLength(0);
  });

  it('never returns CLEAN', () => {
    const result = classifyUrlRisk('https://example.com', cleanProbe);
    expect(result.level).not.toBe('CLEAN');
  });
});
