import fs from 'fs';

/**
 * Static inspection of a PDF file for risky constructs.
 * Does NOT execute the PDF — reads raw bytes only.
 * Returns: { findings: Array<{ type, severity, description }> }
 */
export function inspectPdf(filePath) {
  const findings = [];

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'latin1');
  } catch {
    return { findings: [] };
  }

  if (/\/JavaScript/i.test(raw) || /\/JS\b/.test(raw)) {
    findings.push({
      type: 'PDF_JAVASCRIPT',
      severity: 'HIGH',
      description: 'PDF contains /JavaScript or /JS action — possible script execution',
    });
  }

  if (/\/Launch\b/.test(raw)) {
    findings.push({
      type: 'PDF_LAUNCH_ACTION',
      severity: 'HIGH',
      description: 'PDF contains /Launch action — may execute external process',
    });
  }

  if (/\/EmbeddedFile\b/.test(raw)) {
    findings.push({
      type: 'PDF_EMBEDDED_FILE',
      severity: 'MEDIUM',
      description: 'PDF contains embedded file — may carry additional payload',
    });
  }

  if (/\/AA\b/.test(raw) || /\/OpenAction\b/.test(raw)) {
    findings.push({
      type: 'PDF_AUTO_ACTION',
      severity: 'MEDIUM',
      description: 'PDF contains automatic action (/AA or /OpenAction)',
    });
  }

  if (/\/ObjStm\b/.test(raw)) {
    findings.push({
      type: 'PDF_OBJECT_STREAM',
      severity: 'LOW',
      description: 'PDF uses object streams — may obfuscate content',
    });
  }

  return { findings };
}
