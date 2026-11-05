'use client';

import { useState } from 'react';
import { Shield, Loader2, Search } from 'lucide-react';
import { ThreatIntelResultView, type ThreatIntelResult } from '@/components/threat-intel/threat-intel-result';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PageState = 'idle' | 'loading' | 'done' | 'error';

const EXAMPLES = [
  { label: 'SHA-256 hash', value: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f' },
  { label: 'Domain', value: 'malware.example.com' },
  { label: 'IP', value: '1.2.3.4' },
];

export default function ThreatIntelPage() {
  const [state, setState] = useState<PageState>('idle');
  const [ioc, setIoc] = useState('');
  const [result, setResult] = useState<ThreatIntelResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = ioc.trim();
    if (!trimmed) return;

    setState('loading');
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/v1/threat-intel/lookup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ioc: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      setResult(await res.json() as ThreatIntelResult);
      setState('done');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setState('error');
    }
  }

  function reset() {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Threat Intelligence</h1>
        <p className="text-muted-foreground">VirusTotal + URLhaus lookup for hashes, IPs, domains, and URLs</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={ioc}
              onChange={(e) => setIoc(e.target.value)}
              placeholder="SHA-256 / MD5 / SHA-1 / IP / domain / URL"
              disabled={state === 'loading'}
              className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!ioc.trim() || state === 'loading'}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Lookup
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setIoc(ex.value)}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </form>

      {state === 'error' && errorMsg && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-6 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Querying VirusTotal and URLhaus…</span>
        </div>
      )}

      {state === 'done' && result && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Lookup complete</span>
            {result.cached && <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">cached</span>}
            <button onClick={reset} className="ml-auto text-xs text-primary hover:underline">
              New lookup
            </button>
          </div>
          <ThreatIntelResultView result={result} />
        </>
      )}
    </div>
  );
}
