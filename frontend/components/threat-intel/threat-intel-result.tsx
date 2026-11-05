'use client';

import { ExternalLink, ShieldAlert, ShieldCheck, Minus, AlertTriangle, AlertCircle } from 'lucide-react';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface VtResult {
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
  total: number;
  engines: { name: string; result: string }[];
  permalink: string | null;
  error?: string;
  skipped?: boolean;
}

export interface UhResult {
  status: 'malware' | 'clean' | 'no_results' | 'error';
  urlCount: number;
  urls: { url: string; urlStatus: string; threat: string; tags: string[] }[];
  permalink: string | null;
  error?: string;
}

export interface ThreatIntelResult {
  ioc: string;
  iocType: string;
  riskLevel: RiskLevel;
  riskExplanation: string;
  cached: boolean;
  virustotal: VtResult | null;
  urlhaus: UhResult | null;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: 'CRITICAL', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/40' },
  HIGH: { label: 'HIGH', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/40' },
  MEDIUM: { label: 'MEDIUM', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/40' },
  LOW: { label: 'LOW', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/40' },
  INCONCLUSIVE: { label: 'INCONCLUSIVE', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const IOC_TYPE_LABELS: Record<string, string> = {
  sha256: 'SHA-256', sha1: 'SHA-1', md5: 'MD5', ip: 'IP Address', domain: 'Domain', url: 'URL',
};

function DetectionBar({ malicious, suspicious, undetected, harmless, total }: { malicious: number; suspicious: number; undetected: number; harmless: number; total: number }) {
  if (total === 0) return <p className="text-xs text-muted-foreground">No scan data available</p>;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {malicious > 0 && <div className="bg-red-500" style={{ width: pct(malicious) }} title={`Malicious: ${malicious}`} />}
        {suspicious > 0 && <div className="bg-orange-400" style={{ width: pct(suspicious) }} title={`Suspicious: ${suspicious}`} />}
        {harmless > 0 && <div className="bg-green-500/40" style={{ width: pct(harmless) }} title={`Harmless: ${harmless}`} />}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="text-red-600 dark:text-red-400 font-medium">{malicious} malicious</span>
        {suspicious > 0 && <span className="text-orange-600 dark:text-orange-400">{suspicious} suspicious</span>}
        <span>{undetected} undetected</span>
        <span className="ml-auto">{total} engines</span>
      </div>
    </div>
  );
}

export function ThreatIntelResultView({ result }: { result: ThreatIntelResult }) {
  const risk = result.riskLevel ?? 'INCONCLUSIVE';
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.INCONCLUSIVE;
  const RiskIcon = risk === 'LOW' ? ShieldCheck : risk === 'INCONCLUSIVE' ? Minus : risk === 'MEDIUM' ? AlertTriangle : ShieldAlert;

  const vt = result.virustotal;
  const uh = result.urlhaus;

  const vtDetectedEngines = vt?.engines.filter((e) => !e.result.toLowerCase().includes('clean')) ?? [];

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-5 py-4 flex items-start gap-4`}>
        <RiskIcon className={`h-6 w-6 mt-0.5 ${cfg.text}`} />
        <div className="min-w-0">
          <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
          {result.riskExplanation && <p className="text-sm text-muted-foreground mt-0.5">{result.riskExplanation}</p>}
        </div>
      </div>

      {/* IOC info */}
      <div className="rounded-lg border p-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">IOC</dt>
            <dd className="font-mono break-all">{result.ioc}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd>{IOC_TYPE_LABELS[result.iocType] ?? result.iocType}</dd>
          </div>
        </dl>
      </div>

      {/* VirusTotal */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">VirusTotal</h3>
          {vt?.permalink && (
            <a href={vt.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              Open report <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {vt?.skipped ? (
          <p className="text-xs text-muted-foreground">VirusTotal API key not configured. Set VIRUSTOTAL_API_KEY to enable.</p>
        ) : vt?.error ? (
          <p className="text-xs text-destructive">Error: {vt.error}</p>
        ) : vt ? (
          <>
            <DetectionBar
              malicious={vt.malicious}
              suspicious={vt.suspicious}
              undetected={vt.undetected}
              harmless={vt.harmless}
              total={vt.total}
            />
            {vtDetectedEngines.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Flagging engines</p>
                <div className="flex flex-wrap gap-1.5">
                  {vtDetectedEngines.slice(0, 20).map((e) => (
                    <span key={e.name} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground ml-1">· {e.result}</span>
                    </span>
                  ))}
                  {vtDetectedEngines.length > 20 && (
                    <span className="text-xs text-muted-foreground">+{vtDetectedEngines.length - 20} more</span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No VirusTotal data.</p>
        )}
      </div>

      {/* URLhaus */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">URLhaus (Abuse.ch)</h3>
          {uh?.permalink && (
            <a href={uh.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              Open report <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {uh?.error ? (
          <p className="text-xs text-destructive">Error: {uh.error}</p>
        ) : uh?.status === 'malware' ? (
          <div className="space-y-2">
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Listed as malware distribution source ({uh.urlCount} URL{uh.urlCount !== 1 ? 's' : ''})</p>
            {uh.urls.slice(0, 5).map((u, i) => (
              <div key={i} className="rounded bg-muted px-3 py-2 text-xs space-y-0.5">
                <p className="font-mono break-all">{u.url}</p>
                <div className="flex gap-2 text-muted-foreground">
                  <span>Status: <span className={u.urlStatus === 'online' ? 'text-red-500' : ''}>{u.urlStatus}</span></span>
                  {u.threat && <span>Threat: {u.threat}</span>}
                  {u.tags.length > 0 && <span>Tags: {u.tags.join(', ')}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : uh?.status === 'clean' ? (
          <p className="text-sm text-green-600 dark:text-green-400">Not listed in URLhaus database (marked clean)</p>
        ) : uh?.status === 'no_results' ? (
          <p className="text-sm text-muted-foreground">No results found in URLhaus database</p>
        ) : (
          <p className="text-sm text-muted-foreground">No URLhaus data available</p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        Results represent the last known scan at query time. A LOW result means no current detections were found — it does not confirm safety. Files are never uploaded to external services without explicit per-sample authorization.
      </div>
    </div>
  );
}
