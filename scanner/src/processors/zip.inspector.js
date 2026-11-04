import AdmZip from 'adm-zip';

const MAX_DEPTH = 5;
const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_FILES = 1000;

/**
 * Inspect a ZIP archive for structural threats.
 * Returns: { findings: Array<{ type, severity, description }>, metadata }
 */
export function inspectZip(filePath) {
  const findings = [];

  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch {
    return { findings: [], metadata: { error: 'Could not open archive' } };
  }

  const entries = zip.getEntries();

  if (entries.length > MAX_FILES) {
    findings.push({
      type: 'EXCESSIVE_FILE_COUNT',
      severity: 'CRITICAL',
      description: `ZIP contains ${entries.length} entries (limit: ${MAX_FILES}) — possible ZIP bomb`,
    });
  }

  let totalUncompressed = 0;
  let maxDepth = 0;

  for (const entry of entries) {
    const name = entry.entryName;

    // Path traversal check
    if (name.includes('../') || name.includes('..\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) {
      findings.push({
        type: 'PATH_TRAVERSAL',
        severity: 'CRITICAL',
        description: `Entry "${name.slice(0, 80)}" contains path traversal sequence`,
      });
    }

    // Compression ratio check (per-file)
    const compressed = entry.header.compressedSize;
    const uncompressed = entry.header.size;
    if (compressed > 0 && uncompressed / compressed > 1000) {
      findings.push({
        type: 'HIGH_COMPRESSION_RATIO',
        severity: 'CRITICAL',
        description: `Entry "${name.slice(0, 80)}" has compression ratio ${Math.round(uncompressed / compressed)}:1 — possible ZIP bomb`,
      });
    }

    totalUncompressed += uncompressed;
    const depth = name.split('/').length - 1;
    if (depth > maxDepth) maxDepth = depth;
  }

  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
    findings.push({
      type: 'EXCESSIVE_UNCOMPRESSED_SIZE',
      severity: 'CRITICAL',
      description: `Total uncompressed size ${(totalUncompressed / 1024 / 1024).toFixed(1)} MB exceeds limit — possible ZIP bomb`,
    });
  }

  if (maxDepth > MAX_DEPTH) {
    findings.push({
      type: 'EXCESSIVE_NESTING',
      severity: 'HIGH',
      description: `Archive nesting depth ${maxDepth} exceeds limit of ${MAX_DEPTH}`,
    });
  }

  return {
    findings,
    metadata: {
      entryCount: entries.length,
      totalUncompressedBytes: totalUncompressed,
      maxDepth,
    },
  };
}
