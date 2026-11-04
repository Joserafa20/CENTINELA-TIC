'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, Minus, AlertTriangle } from 'lucide-react';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface FileAnalysisResult {
  id: string;
  status: string;
  riskLevel: RiskLevel | null;
  riskExplanation: string | null;
  createdAt: string;
  completedAt: string | null;
  file: {
    originalName: string | null;
    sha256: string | null;
    detectedType: string | null;
    declaredExtension: string | null;
    extensionMismatch: boolean;
    size: number | null;
  } | null;
  clamav: { result: string; signature?: string } | null;
  yara: { rule: string; tags: string[]; severity: string }[];
  metadata: Record<string, unknown> | null;
  structuralFindings: { type: string; severity: string; description: string }[];
  indicators: { type: string; description: string; severity: string }[];
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: 'CRITICAL', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/40' },
  HIGH: { label: 'HIGH', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/40' },
  MEDIUM: { label: 'MEDIUM', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/40' },
  LOW: { label: 'LOW', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/40' },
  INCONCLUSIVE: { label: 'INCONCLUSIVE', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function Badge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[severity] ?? 'bg-muted text-muted-foreground'}`}>
      {severity}
    </span>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {title}
      </button>
      {open && <div className="border-t px-4 py-4">{children}</div>}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FileAnalysisResultView({ result }: { result: FileAnalysisResult }) {
  const risk = result.riskLevel ?? 'INCONCLUSIVE';
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.INCONCLUSIVE;

  const RiskIcon = risk === 'LOW' ? ShieldCheck : risk === 'INCONCLUSIVE' ? Minus : risk === 'MEDIUM' ? AlertTriangle : ShieldAlert;

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-5 py-4 flex items-start gap-4`}>
        <RiskIcon className={`h-6 w-6 mt-0.5 ${cfg.text}`} />
        <div>
          <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
          {result.riskExplanation && (
            <p className="text-sm text-muted-foreground mt-0.5">{result.riskExplanation}</p>
          )}
        </div>
      </div>

      {/* File metadata */}
      {result.file && (
        <Section title="File Information" defaultOpen>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="font-mono break-all">{result.file.originalName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd>{result.file.size != null ? formatBytes(result.file.size) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Detected Type</dt>
              <dd className="font-mono">{result.file.detectedType ?? 'unknown'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Declared Extension</dt>
              <dd className="font-mono">{result.file.declaredExtension ?? '—'}</dd>
            </div>
            {result.file.extensionMismatch && (
              <div className="sm:col-span-2">
                <span className="inline-flex items-center gap-1 rounded bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-3 w-3" /> Extension mismatch detected
                </span>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">SHA-256</dt>
              <dd className="font-mono text-xs break-all">{result.file.sha256 ?? '—'}</dd>
            </div>
          </dl>
        </Section>
      )}

      {/* ClamAV */}
      <Section title={`ClamAV — ${result.clamav?.result?.toUpperCase() ?? 'N/A'}`} defaultOpen>
        {result.clamav ? (
          <div className="text-sm">
            {result.clamav.result === 'detected' ? (
              <div className="flex items-center gap-2">
                <Badge severity="HIGH" />
                <span className="font-mono">{result.clamav.signature ?? 'unknown signature'}</span>
              </div>
            ) : result.clamav.result === 'clean' ? (
              <p className="text-muted-foreground">No known malware signatures found.</p>
            ) : result.clamav.result === 'error' ? (
              <p className="text-destructive">ClamAV could not complete the scan.</p>
            ) : (
              <p className="text-muted-foreground capitalize">{result.clamav.result}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not available.</p>
        )}
      </Section>

      {/* YARA matches */}
      <Section title={`YARA Rules — ${Array.isArray(result.yara) ? result.yara.length : 0} match(es)`}>
        {Array.isArray(result.yara) && result.yara.length > 0 ? (
          <ul className="space-y-2">
            {result.yara.map((m, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Badge severity={m.severity} />
                <div>
                  <span className="font-mono font-medium">{m.rule}</span>
                  {m.tags.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">[{m.tags.join(', ')}]</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No YARA rules matched.</p>
        )}
      </Section>

      {/* Structural findings */}
      <Section title={`Structural Findings — ${result.structuralFindings.length}`}>
        {result.structuralFindings.length > 0 ? (
          <ul className="space-y-2">
            {result.structuralFindings.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Badge severity={f.severity} />
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{f.type}</span>
                  <p className="mt-0.5">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No structural issues detected.</p>
        )}
      </Section>

      {/* All indicators */}
      {result.indicators.length > 0 && (
        <Section title={`All Indicators — ${result.indicators.length}`}>
          <ul className="space-y-1.5">
            {result.indicators.map((ind, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Badge severity={ind.severity} />
                <span>{ind.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-xs text-muted-foreground">
        Analysis ID: <span className="font-mono">{result.id}</span>
        {result.completedAt && ` · Completed ${new Date(result.completedAt).toLocaleString()}`}
      </p>
    </div>
  );
}
