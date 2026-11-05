'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';
type AnalysisType = 'EMAIL' | 'FILE' | 'URL' | 'EMAIL_VERIFY';
type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Analysis {
  id: string;
  type: AnalysisType;
  inputName: string | null;
  riskLevel: RiskLevel | null;
  status: AnalysisStatus;
  createdAt: string;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: 'text-red-600 bg-red-500/10 border-red-500/30',
  HIGH: 'text-orange-600 bg-orange-500/10 border-orange-500/30',
  MEDIUM: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30',
  LOW: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  INCONCLUSIVE: 'text-muted-foreground bg-muted border-border',
};

const TYPE_LABELS: Record<AnalysisType, string> = {
  EMAIL: 'Email',
  FILE: 'File',
  URL: 'URL',
  EMAIL_VERIFY: 'Email Verify',
};

function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${RISK_COLORS[level] ?? RISK_COLORS.INCONCLUSIVE}`}>
      {level}
    </span>
  );
}

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<AnalysisType | ''>('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const LIMIT = 20;

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (typeFilter) params.set('type', typeFilter);
      if (riskFilter) params.set('riskLevel', riskFilter);
      const res = await fetch(`${API_BASE}/v1/analyses?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Analysis[]; meta: { total: number } };
      setAnalyses(json.data);
      setTotal(json.meta.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, riskFilter]);

  useEffect(() => { void fetchAnalyses(); }, [fetchAnalyses]);

  async function downloadPdf(id: string) {
    setPdfLoading(id);
    try {
      const res = await fetch(`${API_BASE}/v1/reports/${id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error(`PDF generation failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `centinela-report-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPdfLoading(null);
    }
  }

  async function exportCsv() {
    setCsvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/reports/export/csv`, { credentials: 'include' });
      if (!res.ok) throw new Error(`CSV export failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `centinela-iocs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCsvLoading(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports &amp; History</h1>
          <p className="text-muted-foreground">Download PDF reports or export all IOCs as CSV</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void fetchAnalyses()}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => void exportCsv()}
            disabled={csvLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {csvLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export IOCs (CSV)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setPage(1); setTypeFilter(e.target.value as AnalysisType | ''); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All types</option>
          {(Object.keys(TYPE_LABELS) as AnalysisType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(e) => { setPage(1); setRiskFilter(e.target.value as RiskLevel | ''); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All risk levels</option>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INCONCLUSIVE'] as RiskLevel[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {(typeFilter || riskFilter) && (
          <button onClick={() => { setTypeFilter(''); setRiskFilter(''); setPage(1); }} className="text-xs text-primary hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : analyses.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          No analyses found{typeFilter || riskFilter ? ' for the selected filters' : ''}.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">ID</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Input</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Risk</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">Created</th>
                <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{TYPE_LABELS[a.type] ?? a.type}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={a.inputName ?? undefined}>
                    {a.inputName ?? '—'}
                  </td>
                  <td className="px-4 py-3"><RiskBadge level={a.riskLevel} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${a.status === 'FAILED' ? 'text-destructive' : a.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'COMPLETED' ? (
                      <button
                        onClick={() => void downloadPdf(a.id)}
                        disabled={pdfLoading === a.id}
                        title="Download PDF report"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                      >
                        {pdfLoading === a.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileText className="h-3.5 w-3.5" />}
                        PDF
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} total</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border px-3 py-1 text-xs hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border px-3 py-1 text-xs hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
