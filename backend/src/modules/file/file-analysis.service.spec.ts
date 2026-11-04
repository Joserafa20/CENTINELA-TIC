import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicBytesService } from './magic-bytes.service';
import { classifyFileRisk } from './file-risk-engine';

// ── MagicBytesService ──────────────────────────────────────────────────────

describe('MagicBytesService', () => {
  const svc = new MagicBytesService();

  it('detects PDF by magic bytes', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const result = svc.detect(buf, 'document.pdf');
    expect(result.detectedMime).toBe('application/pdf');
    expect(result.extensionMismatch).toBe(false);
  });

  it('flags extension mismatch: EXE with .pdf extension', () => {
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const result = svc.detect(buf, 'invoice.pdf');
    expect(result.detectedMime).toBe('application/x-dosexec');
    expect(result.extensionMismatch).toBe(true);
    expect(result.mismatchDetails).toContain('.pdf');
  });

  it('does NOT flag mismatch for .docx (ZIP-based)', () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    const result = svc.detect(buf, 'report.docx');
    expect(result.extensionMismatch).toBe(false);
  });

  it('returns unknown for unrecognised bytes', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const result = svc.detect(buf, 'mystery.bin');
    expect(result.confidence).toBe('unknown');
    expect(result.extensionMismatch).toBe(false);
  });

  it('detects OLE2 (DOC/MSG)', () => {
    const buf = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const result = svc.detect(buf, 'email.msg');
    expect(result.detectedMime).toBe('application/vnd.ms-office');
  });
});

// ── classifyFileRisk ───────────────────────────────────────────────────────

describe('classifyFileRisk', () => {
  const base = {
    status: 'COMPLETED',
    extensionMismatch: false,
    clamav: { result: 'clean' as const },
    yara: { matches: [] },
    structuralFindings: [],
  };

  it('returns CRITICAL for path-traversal structural finding', () => {
    const result = classifyFileRisk({
      ...base,
      structuralFindings: [{ type: 'PATH_TRAVERSAL', severity: 'CRITICAL', description: 'Path traversal in ZIP' }],
    });
    expect(result.level).toBe('CRITICAL');
  });

  it('returns CRITICAL for YARA critical match', () => {
    const result = classifyFileRisk({
      ...base,
      yara: { matches: [{ rule: 'Ransomware_Locker', tags: ['ransomware'], severity: 'CRITICAL' }] },
    });
    expect(result.level).toBe('CRITICAL');
  });

  it('returns HIGH when ClamAV detects malware', () => {
    const result = classifyFileRisk({
      ...base,
      clamav: { result: 'detected', signature: 'Win.Trojan.Agent' },
    });
    expect(result.level).toBe('HIGH');
    expect(result.explanation).toContain('Win.Trojan.Agent');
  });

  it('returns HIGH for extension mismatch', () => {
    const result = classifyFileRisk({ ...base, extensionMismatch: true });
    expect(result.level).toBe('HIGH');
  });

  it('returns INCONCLUSIVE when ClamAV errors', () => {
    const result = classifyFileRisk({ ...base, clamav: { result: 'error' } });
    expect(result.level).toBe('INCONCLUSIVE');
  });

  it('returns INCONCLUSIVE when analysis failed', () => {
    const result = classifyFileRisk({ ...base, status: 'FAILED' });
    expect(result.level).toBe('INCONCLUSIVE');
  });

  it('returns LOW when ClamAV clean with no YARA or structural findings', () => {
    const result = classifyFileRisk(base);
    expect(result.level).toBe('LOW');
    expect(result.explanation).toContain('absence of detections');
  });

  it('never returns CLEAN', () => {
    const result = classifyFileRisk(base);
    expect(result.level).not.toBe('CLEAN');
  });

  it('returns MEDIUM for YARA medium severity match', () => {
    const result = classifyFileRisk({
      ...base,
      yara: { matches: [{ rule: 'Suspicious_Macro', tags: [], severity: 'MEDIUM' }] },
    });
    expect(result.level).toBe('MEDIUM');
  });
});
