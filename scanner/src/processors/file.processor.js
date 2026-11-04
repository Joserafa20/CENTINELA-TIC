import fs from 'fs';
import { scanWithClamAV } from './clam.scanner.js';
import { scanWithYARA } from './yara.scanner.js';
import { inspectZip } from './zip.inspector.js';
import { inspectPdf } from './pdf.inspector.js';

const ZIP_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/java-archive',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
]);

/**
 * Full file analysis pipeline.
 * Returns the result object that the backend's QueueEvents listener expects.
 */
export async function processFileJob(data) {
  const { analysisId, filePath, fileName } = data;

  if (!fs.existsSync(filePath)) {
    return buildInconclusiveResult(analysisId, 'File not found on scanner filesystem');
  }

  // Identify file type from magic bytes
  const detectedMime = detectMagicMime(filePath);
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();

  // Run ClamAV and YARA in parallel
  const [clamav, yaraResult] = await Promise.all([
    scanWithClamAV(filePath),
    scanWithYARA(filePath),
  ]);

  // Format-specific structural analysis
  const structuralFindings = [];
  if (detectedMime === 'application/pdf' || ext === 'pdf') {
    const { findings } = inspectPdf(filePath);
    structuralFindings.push(...findings);
  } else if (detectedMime === 'application/zip' || isZipExt(ext)) {
    const { findings } = inspectZip(filePath);
    structuralFindings.push(...findings);
  }

  // Build risk using same logic as backend engine (mirrored here for scanner autonomy)
  const { level: riskLevel, explanation: riskExplanation } = classifyRisk({
    extensionMismatch: detectExtensionMismatch(detectedMime, ext),
    clamav,
    yara: yaraResult,
    structuralFindings,
  });

  const indicators = buildIndicators(clamav, yaraResult, structuralFindings);

  return {
    analysisId,
    status: 'COMPLETED',
    riskLevel,
    riskExplanation,
    clamav,
    yara: yaraResult,
    structuralFindings,
    indicators,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildInconclusiveResult(analysisId, reason) {
  return {
    analysisId,
    status: 'FAILED',
    riskLevel: 'INCONCLUSIVE',
    riskExplanation: reason,
    clamav: { result: 'error' },
    yara: { matches: [] },
    structuralFindings: [],
    indicators: [],
  };
}

function isZipExt(ext) {
  return ['zip', 'docx', 'xlsx', 'pptx', 'jar', 'apk', 'rar', '7z'].includes(ext);
}

function detectMagicMime(filePath) {
  try {
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
    if (buf[0] === 0x50 && buf[1] === 0x4b) return 'application/zip';
    if (buf[0] === 0x4d && buf[1] === 0x5a) return 'application/x-dosexec';
    if (buf[0] === 0xd0 && buf[1] === 0xcf) return 'application/vnd.ms-office';
  } catch { /* ignore */ }
  return 'application/octet-stream';
}

function detectExtensionMismatch(mime, ext) {
  if (mime === 'application/x-dosexec' && !['exe', 'dll', 'sys', 'com'].includes(ext)) return true;
  if (mime === 'application/pdf' && ext !== 'pdf') return true;
  return false;
}

function classifyRisk({ extensionMismatch, clamav, yara, structuralFindings }) {
  const criticalFinding = structuralFindings.find((f) => f.severity === 'CRITICAL');
  if (criticalFinding) return { level: 'CRITICAL', explanation: criticalFinding.description };

  const criticalYara = yara.matches.find((m) => m.severity === 'CRITICAL');
  if (criticalYara) return { level: 'CRITICAL', explanation: `YARA rule matched: ${criticalYara.rule}` };

  if (clamav.result === 'detected') {
    return { level: 'HIGH', explanation: `ClamAV detected: ${clamav.signature ?? 'unknown signature'}` };
  }

  const highYara = yara.matches.find((m) => m.severity === 'HIGH');
  if (highYara) return { level: 'HIGH', explanation: `YARA rule matched: ${highYara.rule}` };

  const highFinding = structuralFindings.find((f) => f.severity === 'HIGH');
  if (highFinding) return { level: 'HIGH', explanation: highFinding.description };

  if (extensionMismatch) return { level: 'HIGH', explanation: 'File extension does not match detected file type (possible disguised executable).' };

  if (clamav.result === 'error') return { level: 'INCONCLUSIVE', explanation: 'ClamAV scan could not complete. Manual inspection recommended.' };

  const mediumYara = yara.matches.find((m) => m.severity === 'MEDIUM');
  if (mediumYara) return { level: 'MEDIUM', explanation: `YARA rule matched (medium severity): ${mediumYara.rule}` };

  const mediumFinding = structuralFindings.find((f) => f.severity === 'MEDIUM');
  if (mediumFinding) return { level: 'MEDIUM', explanation: mediumFinding.description };

  return {
    level: 'LOW',
    explanation: 'ClamAV found no known malware signatures. No YARA rules matched. No structural issues detected. Classification is LOW — absence of detections does not confirm safety.',
  };
}

function buildIndicators(clamav, yara, structuralFindings) {
  const indicators = [];
  if (clamav.result === 'detected') {
    indicators.push({ type: 'CLAMAV_DETECTION', description: `ClamAV: ${clamav.signature}`, severity: 'HIGH' });
  }
  for (const m of yara.matches ?? []) {
    indicators.push({ type: 'YARA_MATCH', description: `YARA: ${m.rule}`, severity: m.severity ?? 'MEDIUM' });
  }
  for (const f of structuralFindings) {
    indicators.push({ type: f.type, description: f.description, severity: f.severity });
  }
  return indicators;
}
