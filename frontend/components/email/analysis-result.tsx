'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Shield, Link2, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/lib/api';

interface AuthHeaders {
  from: string | null;
  replyTo: string | null;
  returnPath: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  spf: string | null;
  dkim: string | null;
  dmarc: string | null;
}

interface Indicator {
  id: string;
  type: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

interface AttachmentResult {
  filename: string | null;
  mimeType: string;
  sha256: string;
  size: number;
}

export interface EmailAnalysisResult {
  id: string;
  status: string;
  riskLevel: RiskLevel | null;
  riskExplanation: string | null;
  createdAt: string;
  completedAt: string | null;
  headers: AuthHeaders | null;
  urls: string[];
  attachments: AttachmentResult[];
  indicators: Indicator[];
}

const SEVERITY_VARIANT: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'low',
};

const RISK_VARIANT: Record<RiskLevel, 'critical' | 'high' | 'medium' | 'low' | 'clean' | 'inconclusive'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', CLEAN: 'clean', INCONCLUSIVE: 'inconclusive',
};

function AuthBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const v = value.toUpperCase();
  const color = v === 'PASS' ? 'text-green-600 dark:text-green-400' : v === 'FAIL' ? 'text-red-500' : 'text-yellow-500';
  return <span className={`text-xs font-mono font-bold ${color}`}>{v}</span>;
}

function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {title}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t">{children}</div>}
    </div>
  );
}

export function EmailAnalysisResultView({ result }: { result: EmailAnalysisResult }) {
  const riskLevel = result.riskLevel ?? 'INCONCLUSIVE';

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <div className="rounded-lg border bg-card p-4 flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-muted-foreground">Risk Level</span>
            <Badge variant={RISK_VARIANT[riskLevel]}>{riskLevel}</Badge>
          </div>
          <p className="text-sm text-foreground">{result.riskExplanation ?? 'No explanation available.'}</p>
        </div>
      </div>

      {/* Headers & Auth */}
      {result.headers && (
        <Section title="Headers & Authentication" icon={Shield} defaultOpen>
          <div className="grid gap-2 mt-2">
            {[
              { label: 'From', value: result.headers.from },
              { label: 'Reply-To', value: result.headers.replyTo },
              { label: 'Return-Path', value: result.headers.returnPath },
              { label: 'Subject', value: result.headers.subject },
              { label: 'Date', value: result.headers.date },
              { label: 'Message-ID', value: result.headers.messageId },
            ].map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="font-mono break-all">{value ?? '—'}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 grid grid-cols-3 gap-4">
              <div className="text-center"><p className="text-xs text-muted-foreground mb-1">SPF</p><AuthBadge value={result.headers.spf} /></div>
              <div className="text-center"><p className="text-xs text-muted-foreground mb-1">DKIM</p><AuthBadge value={result.headers.dkim} /></div>
              <div className="text-center"><p className="text-xs text-muted-foreground mb-1">DMARC</p><AuthBadge value={result.headers.dmarc} /></div>
            </div>
          </div>
        </Section>
      )}

      {/* Indicators */}
      {result.indicators.length > 0 && (
        <Section title={`Indicators (${result.indicators.length})`} icon={AlertTriangle} defaultOpen>
          <div className="space-y-2 mt-2">
            {result.indicators.map((ind) => (
              <div key={ind.id} className="flex items-start gap-2 text-sm">
                <Badge variant={SEVERITY_VARIANT[ind.severity] ?? 'low'} className="shrink-0 mt-0.5">{ind.severity}</Badge>
                <div>
                  <span className="font-mono text-xs text-muted-foreground mr-2">{ind.type}</span>
                  <span>{ind.description}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* URLs */}
      {result.urls.length > 0 && (
        <Section title={`Extracted URLs (${result.urls.length})`} icon={Link2}>
          <ul className="mt-2 space-y-1">
            {result.urls.map((url, i) => (
              <li key={i} className="font-mono text-xs break-all text-muted-foreground hover:text-foreground transition-colors">
                {url}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Attachments */}
      {result.attachments.length > 0 && (
        <Section title={`Attachments (${result.attachments.length})`} icon={Paperclip}>
          <div className="mt-2 space-y-2">
            {result.attachments.map((att, i) => (
              <div key={i} className="text-sm border rounded p-2">
                <p className="font-medium">{att.filename ?? 'Unknown file'}</p>
                <p className="text-xs text-muted-foreground">{att.mimeType} · {(att.size / 1024).toFixed(1)} KB</p>
                <p className="font-mono text-xs text-muted-foreground break-all mt-1">SHA-256: {att.sha256}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
