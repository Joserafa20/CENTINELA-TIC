import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Scan a file with ClamAV CLI.
 * Returns: { result: 'clean'|'detected'|'error', signature?: string }
 */
export async function scanWithClamAV(filePath) {
  try {
    // --no-summary suppresses the footer; --stdout keeps output simple
    await execFileAsync('clamscan', ['--no-summary', '--stdout', filePath], {
      timeout: 60_000,
    });
    // Exit 0 = clean
    return { result: 'clean' };
  } catch (err) {
    if (err.code === 1) {
      // Exit 1 = virus found — parse signature from stdout
      const output = err.stdout ?? '';
      const match = output.match(/FOUND\s*$/) ?? output.match(/:\s+(.+)\s+FOUND/);
      const signature = match ? match[1]?.trim() : 'unknown';
      return { result: 'detected', signature };
    }
    // Exit 2 = scan error; command not found, etc.
    return { result: 'error', error: (err.message ?? String(err)).slice(0, 200) };
  }
}
