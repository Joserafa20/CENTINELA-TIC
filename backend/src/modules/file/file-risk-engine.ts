/**
 * Risk classification rules for file analysis.
 * See SPEC-004 §6.
 */

export type FileRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'INCONCLUSIVE';

export interface ClamResult {
  result: 'clean' | 'detected' | 'error' | 'pending';
  signature?: string | null;
}

export interface YaraMatch {
  rule: string;
  tags: string[];
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StructuralFinding {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface FileRiskInput {
  status: string;
  extensionMismatch: boolean;
  clamav: ClamResult;
  yara: { matches: YaraMatch[] };
  structuralFindings: StructuralFinding[];
}

export interface FileRiskResult {
  level: FileRiskLevel;
  explanation: string;
}

export function classifyFileRisk(input: FileRiskInput): FileRiskResult {
  if (input.status === 'FAILED' || input.status === 'PENDING') {
    return { level: 'INCONCLUSIVE', explanation: 'Analysis could not complete.' };
  }

  // Path traversal or ZIP bomb → CRITICAL
  const criticalFinding = input.structuralFindings.find((f) => f.severity === 'CRITICAL');
  if (criticalFinding) {
    return { level: 'CRITICAL', explanation: criticalFinding.description };
  }

  // YARA critical rule match → CRITICAL
  const criticalYara = input.yara.matches.find((m) => m.severity === 'CRITICAL');
  if (criticalYara) {
    return { level: 'CRITICAL', explanation: `YARA rule matched: ${criticalYara.rule}` };
  }

  // ClamAV detection → HIGH minimum
  if (input.clamav.result === 'detected') {
    return {
      level: 'HIGH',
      explanation: `ClamAV detected: ${input.clamav.signature ?? 'unknown signature'}`,
    };
  }

  // YARA high severity → HIGH
  const highYara = input.yara.matches.find((m) => m.severity === 'HIGH');
  if (highYara) {
    return { level: 'HIGH', explanation: `YARA rule matched: ${highYara.rule}` };
  }

  // High structural finding (PDF JS, macro, etc.) → HIGH
  const highFinding = input.structuralFindings.find((f) => f.severity === 'HIGH');
  if (highFinding) {
    return { level: 'HIGH', explanation: highFinding.description };
  }

  // Extension mismatch (e.g., EXE disguised as PDF) → HIGH
  if (input.extensionMismatch) {
    return { level: 'HIGH', explanation: 'File extension does not match detected file type (possible disguised executable).' };
  }

  // ClamAV error → INCONCLUSIVE
  if (input.clamav.result === 'error') {
    return { level: 'INCONCLUSIVE', explanation: 'ClamAV scan could not complete. Manual inspection recommended.' };
  }

  // YARA medium → MEDIUM
  const mediumYara = input.yara.matches.find((m) => m.severity === 'MEDIUM');
  if (mediumYara) {
    return { level: 'MEDIUM', explanation: `YARA rule matched (medium severity): ${mediumYara.rule}` };
  }

  // Medium structural finding
  const mediumFinding = input.structuralFindings.find((f) => f.severity === 'MEDIUM');
  if (mediumFinding) {
    return { level: 'MEDIUM', explanation: mediumFinding.description };
  }

  // ClamAV clean, no YARA, no structural issues → LOW
  // NOTE: We do not use CLEAN because absence of detection ≠ safe.
  return {
    level: 'LOW',
    explanation: 'ClamAV found no known malware signatures. No YARA rules matched. No structural issues detected. Classification is LOW — absence of detections does not confirm safety.',
  };
}
