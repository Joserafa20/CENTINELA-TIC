'use client';

import { CheckCircle2, XCircle, AlertCircle, MinusCircle, ShieldAlert, ShieldCheck, Minus, AlertTriangle } from 'lucide-react';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

export interface EmailVerifyResult {
  id: string;
  status: string;
  riskLevel: RiskLevel | null;
  riskExplanation: string | null;
  createdAt: string;
  completedAt: string | null;
  email: string | null;
  syntax: { valid: boolean; reason?: string } | null;
  domain: {
    domain: string;
    exists: boolean;
    mxRecords: { exchange: string; priority: number }[];
  } | null;
  authentication: {
    spf: { present: boolean; record?: string; strength?: string } | null;
    dmarc: { present: boolean; record?: string; policy?: string } | null;
    dkim: { present: boolean; selectors?: { selector: string; record: string }[] } | null;
  } | null;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: 'CRITICAL', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/40' },
  HIGH: { label: 'HIGH', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/40' },
  MEDIUM: { label: 'MEDIUM', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/40' },
  LOW: { label: 'LOW', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/40' },
  INCONCLUSIVE: { label: 'INCONCLUSIVE', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

function StatusIcon({ present, size = 'h-4 w-4' }: { present: boolean | null; size?: string }) {
  if (present === null) return <MinusCircle className={`${size} text-muted-foreground`} />;
  return present
    ? <CheckCircle2 className={`${size} text-green-500`} />
    : <XCircle className={`${size} text-red-500`} />;
}

function SpfStrengthBadge({ strength }: { strength?: string }) {
  const map: Record<string, string> = {
    hard_fail: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    soft_fail: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    pass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  if (!strength) return null;
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${map[strength] ?? 'bg-muted text-muted-foreground'}`}>
      {strength.replace('_', ' ')}
    </span>
  );
}

function DmarcPolicyBadge({ policy }: { policy?: string }) {
  const map: Record<string, string> = {
    reject: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    quarantine: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    none: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  if (!policy) return null;
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${map[policy] ?? 'bg-muted text-muted-foreground'}`}>
      p={policy}
    </span>
  );
}

export function EmailVerifyResultView({ result }: { result: EmailVerifyResult }) {
  const risk = result.riskLevel ?? 'INCONCLUSIVE';
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.INCONCLUSIVE;
  const RiskIcon = risk === 'LOW' ? ShieldCheck : risk === 'INCONCLUSIVE' ? Minus : risk === 'MEDIUM' ? AlertTriangle : ShieldAlert;

  const auth = result.authentication;
  const domain = result.domain;

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

      {/* Syntax check */}
      {result.syntax && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Syntax</h3>
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon present={result.syntax.valid} />
            <span className="font-mono">{result.email}</span>
            {!result.syntax.valid && result.syntax.reason && (
              <span className="text-xs text-destructive ml-1">— {result.syntax.reason}</span>
            )}
          </div>
        </div>
      )}

      {/* Domain / MX */}
      {domain && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Domain & MX Records</h3>
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon present={domain.exists} />
            <span className="font-mono">{domain.domain}</span>
            <span className="text-xs text-muted-foreground">— domain {domain.exists ? 'exists' : 'not found'}</span>
          </div>
          {domain.mxRecords.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">MX Records</p>
              <ul className="space-y-1">
                {domain.mxRecords.map((mx, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-muted-foreground">{mx.priority}</span>
                    <span>{mx.exchange}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              No MX records found
            </div>
          )}
        </div>
      )}

      {/* Authentication */}
      {auth && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-medium">Authentication (SPF · DMARC · DKIM)</h3>

          {/* SPF */}
          <div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon present={auth.spf?.present ?? false} />
              <span className="font-medium">SPF</span>
              {auth.spf?.present && <SpfStrengthBadge strength={auth.spf.strength} />}
            </div>
            {auth.spf?.record && (
              <p className="mt-1 font-mono text-xs text-muted-foreground break-all pl-6">{auth.spf.record}</p>
            )}
            {!auth.spf?.present && (
              <p className="text-xs text-muted-foreground pl-6 mt-0.5">No SPF record found on this domain</p>
            )}
          </div>

          {/* DMARC */}
          <div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon present={auth.dmarc?.present ?? false} />
              <span className="font-medium">DMARC</span>
              {auth.dmarc?.present && <DmarcPolicyBadge policy={auth.dmarc.policy} />}
            </div>
            {auth.dmarc?.record && (
              <p className="mt-1 font-mono text-xs text-muted-foreground break-all pl-6">{auth.dmarc.record}</p>
            )}
            {!auth.dmarc?.present && (
              <p className="text-xs text-muted-foreground pl-6 mt-0.5">No DMARC record found at _dmarc.{domain?.domain}</p>
            )}
          </div>

          {/* DKIM */}
          <div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon present={auth.dkim?.present ?? false} />
              <span className="font-medium">DKIM</span>
              {auth.dkim?.present && (
                <span className="text-xs text-muted-foreground">
                  {auth.dkim.selectors?.length} selector{(auth.dkim.selectors?.length ?? 0) !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            {auth.dkim?.selectors?.map((s) => (
              <div key={s.selector} className="mt-1 pl-6">
                <span className="text-xs font-medium font-mono text-muted-foreground">{s.selector}._domainkey</span>
                <p className="font-mono text-xs text-muted-foreground break-all">{s.record.slice(0, 120)}{s.record.length > 120 ? '…' : ''}</p>
              </div>
            ))}
            {!auth.dkim?.present && (
              <p className="text-xs text-muted-foreground pl-6 mt-0.5">No DKIM records found for common selectors</p>
            )}
          </div>
        </div>
      )}

      {/* How to interpret */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        A LOW result means anti-spoofing controls are in place, not that the email address belongs to a legitimate sender.
        Always combine domain verification with contextual analysis.
      </div>

      <p className="text-xs text-muted-foreground">
        Analysis ID: <span className="font-mono">{result.id}</span>
        {result.completedAt && ` · ${new Date(result.completedAt).toLocaleString()}`}
      </p>
    </div>
  );
}
