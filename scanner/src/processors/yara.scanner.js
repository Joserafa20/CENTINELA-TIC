import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(__dirname, '../rules/centinela.yar');

/**
 * Run YARA rules against a file.
 * Returns: { matches: Array<{ rule, tags, severity }>, error?: string }
 */
export async function scanWithYARA(filePath) {
  try {
    const { stdout } = await execFileAsync(
      'yara',
      ['-m', '--print-tags', RULES_PATH, filePath],
      { timeout: 30_000 },
    );

    const matches = parseYaraOutput(stdout);
    return { matches };
  } catch (err) {
    if (err.code === 0) return { matches: [] };
    // yara exits 1 on no matches in some builds — treat stderr-only as no match
    if (!err.stdout && err.stderr) return { matches: [] };
    return { matches: [], error: (err.message ?? String(err)).slice(0, 200) };
  }
}

function parseYaraOutput(output) {
  const matches = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: RuleName [tags] /path/to/file  or  RuleName /path/to/file
    const m = trimmed.match(/^(\w+)\s+(?:\[([^\]]*)\]\s+)?(.+)$/);
    if (!m) continue;
    const ruleName = m[1];
    const tags = m[2] ? m[2].split(',').map((t) => t.trim()).filter(Boolean) : [];

    // Derive severity from metadata comment pattern in rule output
    // yara -m prints meta as `rule_name [tags] file` — severity is embedded in tags by convention
    const severity = extractSeverity(ruleName, tags);
    matches.push({ rule: ruleName, tags, severity });
  }
  return matches;
}

function extractSeverity(ruleName, tags) {
  // Tags added by -m flag include meta key=value; look for severity
  const severityTag = tags.find((t) => /^severity=/i.test(t));
  if (severityTag) return severityTag.split('=')[1].toUpperCase();
  // Fall back to rule name heuristics
  if (/ransomware|zip_bomb|critical/i.test(ruleName)) return 'CRITICAL';
  if (/trojan|macro|credential|download|autoexec/i.test(ruleName)) return 'HIGH';
  if (/obfuscat|packer|section/i.test(ruleName)) return 'MEDIUM';
  return 'LOW';
}
