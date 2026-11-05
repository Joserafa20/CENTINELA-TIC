'use client';

import { useState } from 'react';
import { Link2, Loader2, Search } from 'lucide-react';
import { UrlAnalysisResultView, type UrlAnalysisResult } from '@/components/url-analysis/url-analysis-result';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PageState = 'idle' | 'loading' | 'polling' | 'done' | 'error';

export default function UrlAnalyzerPage() {
  const [state, setState] = useState<PageState>('idle');
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<UrlAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setState('loading');
    setErrorMsg(null);
    setResult(null);

    let analysisId: string;
    try {
      const res = await fetch(`${API_BASE}/v1/url-analysis`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { analysisId: string; status: string };
      analysisId = data.analysisId;
      // SSRF-blocked URLs complete synchronously
      if (data.status === 'COMPLETED') {
        await fetchResult(analysisId);
        return;
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
      setState('error');
      return;
    }

    setState('polling');
    await pollResult(analysisId);
  }

  async function fetchResult(id: string) {
    const res = await fetch(`${API_BASE}/v1/url-analysis/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setResult(await res.json() as UrlAnalysisResult);
    setState('done');
  }

  async function pollResult(id: string, attempts = 0) {
    if (attempts > 30) {
      setErrorMsg('Analysis timed out. Please try again.');
      setState('error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/v1/url-analysis/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as UrlAnalysisResult;
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setResult(data);
        setState('done');
        return;
      }
    } catch { /* keep polling */ }
    setTimeout(() => pollResult(id, attempts + 1), 1000);
  }

  function reset() {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">URL Analyzer</h1>
        <p className="text-muted-foreground">Redirect chain · TLS · SSRF detection · suspicious indicator checks</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={state === 'loading' || state === 'polling'}
            className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || state === 'loading' || state === 'polling'}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {state === 'loading' || state === 'polling'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Search className="h-4 w-4" />}
          Analyze
        </button>
      </form>

      {state === 'error' && errorMsg && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {(state === 'loading' || state === 'polling') && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-6 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {state === 'loading' ? 'Submitting…' : 'Probing URL — following redirects, checking TLS…'}
          </span>
        </div>
      )}

      {state === 'done' && result && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Analysis complete</span>
            <button onClick={reset} className="ml-auto text-xs text-primary hover:underline">
              Analyze another
            </button>
          </div>
          <UrlAnalysisResultView result={result} />
        </>
      )}
    </div>
  );
}
