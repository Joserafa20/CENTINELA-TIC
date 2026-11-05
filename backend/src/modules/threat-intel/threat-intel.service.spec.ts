import { describe, it, expect } from 'vitest';

// ── IOC type detection (extracted for testability) ─────────────────────────

function detectIocType(value: string): string | null {
  const v = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(v)) return 'sha256';
  if (/^[0-9a-fA-F]{40}$/.test(v)) return 'sha1';
  if (/^[0-9a-fA-F]{32}$/.test(v)) return 'md5';
  if (/^https?:\/\//i.test(v)) return 'url';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) return 'ip';
  if (/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(v)) return 'domain';
  return null;
}

describe('IOC type detection', () => {
  it('detects SHA-256 hash', () => {
    expect(detectIocType('a'.repeat(64))).toBe('sha256');
  });
  it('detects SHA-1 hash', () => {
    expect(detectIocType('a'.repeat(40))).toBe('sha1');
  });
  it('detects MD5 hash', () => {
    expect(detectIocType('a'.repeat(32))).toBe('md5');
  });
  it('detects IPv4 address', () => {
    expect(detectIocType('1.2.3.4')).toBe('ip');
  });
  it('detects https URL', () => {
    expect(detectIocType('https://example.com/path')).toBe('url');
  });
  it('detects http URL', () => {
    expect(detectIocType('http://phish.site')).toBe('url');
  });
  it('detects domain', () => {
    expect(detectIocType('malware.example.com')).toBe('domain');
  });
  it('returns null for unrecognized value', () => {
    expect(detectIocType('not_valid')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(detectIocType('')).toBeNull();
  });
});

// ── Risk aggregation (pure function mirror) ────────────────────────────────

function aggregateRisk(vtMalicious: number, vtSuspicious: number, vtTotal: number, uhMalware: boolean) {
  if (vtMalicious >= 5 || (vtMalicious >= 3 && uhMalware)) return 'CRITICAL';
  if (vtMalicious >= 1) return 'HIGH';
  if (uhMalware) return 'HIGH';
  if (vtSuspicious >= 1) return 'MEDIUM';
  return 'LOW';
}

describe('risk aggregation', () => {
  it('returns CRITICAL for >=5 VT malicious detections', () => {
    expect(aggregateRisk(5, 0, 70, false)).toBe('CRITICAL');
  });
  it('returns CRITICAL when >=3 VT malicious + URLhaus confirms', () => {
    expect(aggregateRisk(3, 0, 70, true)).toBe('CRITICAL');
  });
  it('returns HIGH for 1+ VT malicious detection', () => {
    expect(aggregateRisk(1, 0, 70, false)).toBe('HIGH');
  });
  it('returns HIGH for URLhaus malware with 0 VT detections', () => {
    expect(aggregateRisk(0, 0, 70, true)).toBe('HIGH');
  });
  it('returns MEDIUM for suspicious detections only', () => {
    expect(aggregateRisk(0, 2, 70, false)).toBe('MEDIUM');
  });
  it('returns LOW when both sources return clean', () => {
    expect(aggregateRisk(0, 0, 70, false)).toBe('LOW');
  });
  it('never returns CLEAN', () => {
    const result = aggregateRisk(0, 0, 70, false);
    expect(result).not.toBe('CLEAN');
  });
});
