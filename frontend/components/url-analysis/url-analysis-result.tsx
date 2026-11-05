'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, Minus, AlertTriangle, ArrowRight, Lock, LockOpen, AlertCircle } from 'lucide-react';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface UrlAnalysisResult {
  id: string;
  status: string;
  riskLevel: RiskLevel | null;
  riskExplanation: string | null;
  createdAt: string;
  completedAt: string | null;
  url: string | null;
  domain: string | null;
  parsed: { scheme?: string; host?: string; path?: string; query?: string | null } | null;
  redirectChain: { url: string; status: number; ip: string | null; tls: TlsInfo | null }[];
  tls: TlsInfo | null;
  indicators: { type: string; severity: string; description: string }[];
}

interface TlsInfo {
  subject: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  expired: boolean;
  selfSigned: boolean;
  san: string[];
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
    <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[severity] ?? 'bg-muted text-muted-foreground'}`}>
      {severity}
    </span>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {title}
      </button>
      {open && <div className="border-t px-4 py-4">{children}</div>}
    </div>
  );
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-green-600 dark:text-green-400';
  if (code >= 300 && code < 400) return 'text-yellow-600 dark:text-yellow-400';
  if (code >= 400) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

export function UrlAnalysisResultView({ result }: { result: UrlAnalysisResult }) {
  const risk = result.riskLevel ?? 'INCONCLUSIVE';
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.INCONCLUSIVE;
  const RiskIcon = risk === 'LOW' ? ShieldCheck : risk === 'INCONCLUSIVE' ? Minus : risk === 'MEDIUM' ? AlertTriangle : ShieldAlert;

  const chain = Array.isArray(result.redirectChain) ? result.redirectChain : [];
  const finalTls = result.tls ?? chain[chain.length - 1]?.tls ?? null;
  const isHttps = result.url?.startsWith('https://');

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-5 py-4 flex items-start gap-4`}>
        <RiskIcon className={`h-6 w-6 mt-0.5 ${cfg.text}`} />
        <div>
          <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
          {result.riskExplanation && <p className="text-sm text-muted-foreground mt-0.5">{result.riskExplanation}</p>}
        </div>
      </div>

      {/* URL breakdown */}
      {result.parsed && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">URL Breakdown</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {result.parsed.scheme && <div><dt className="text-xs text-muted-foreground">Scheme</dt><dd className="font-mono">{result.parsed.scheme}</dd></div>}
            {result.parsed.host && <div><dt className="text-xs text-muted-foreground">Host</dt><dd className="font-mono">{result.parsed.host}</dd></div>}
            {result.parsed.path && <div><dt className="text-xs text-muted-foreground">Path</dt><dd className="font-mono truncate">{result.parsed.path}</dd></div>}
            {result.parsed.query && <div><dt className="text-xs text-muted-foreground">Query</dt><dd className="font-mono truncate">{result.parsed.query}</dd></div>}
          </dl>
        </div>
      )}

      {/* Redirect chain */}
      <Section title={`Redirect Chain — ${chain.length} hop${chain.length !== 1 ? 's' : ''}`} defaultOpen={chain.length > 1}>
        {chain.length > 0 ? (
          <ol className="space-y-2">
            {chain.map((hop, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={`font-mono font-bold shrink-0 ${statusColor(hop.status)}`}>{hop.status}</span>
                <div className="min-w-0">
                  <p className="font-mono break-all">{hop.url}</p>
                  {hop.ip && <p className="text-xs text-muted-foreground">IP: {hop.ip}</p>}
                </div>
                {i < chain.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No redirect chain recorded.</p>
        )}
      </Section>

      {/* TLS */}
      {isHttps && (
        <Section title="TLS Certificate" defaultOpen={!!finalTls?.expired || !!finalTls?.selfSigned}>
          {finalTls ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Subject</dt>
                <dd className="font-mono">{finalTls.subject ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Issuer</dt>
                <dd className="font-mono">{finalTls.issuer ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Valid From</dt>
                <dd>{finalTls.validFrom ? new Date(finalTls.validFrom).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Valid To</dt>
                <dd className={finalTls.expired ? 'text-destructive font-medium' : ''}>
                  {finalTls.validTo ? new Date(finalTls.validTo).toLocaleDateString() : '—'}
                  {finalTls.expired && ' (EXPIRED)'}
                </dd>
              </div>
              {finalTls.selfSigned && (
                <div className="sm:col-span-2">
                  <span className="inline-flex items-center gap-1 rounded bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                    <LockOpen className="h-3 w-3" /> Self-signed certificate
                  </span>
                </div>
              )}
              {!finalTls.expired && !finalTls.selfSigned && (
                <div className="sm:col-span-2 flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                  <Lock className="h-3.5 w-3.5" /> Certificate is valid
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">TLS certificate details not available.</p>
          )}
        </Section>
      )}

      {/* Indicators */}
      <Section title={`Indicators — ${result.indicators.length}`} defaultOpen={result.indicators.length > 0}>
        {result.indicators.length > 0 ? (
          <ul className="space-y-2">
            {result.indicators.map((ind, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Badge severity={ind.severity} />
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{ind.type}</span>
                  <p className="mt-0.5">{ind.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No suspicious indicators detected.</p>
        )}
      </Section>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        This analyzer performs passive HEAD requests only and never downloads page content.
        A LOW result means no technical indicators were found — it does not confirm the URL is safe or legitimate.
      </div>

      <p className="text-xs text-muted-foreground">
        Analysis ID: <span className="font-mono">{result.id}</span>
        {result.completedAt && ` · ${new Date(result.completedAt).toLocaleString()}`}
      </p>
    </div>
  );
}
