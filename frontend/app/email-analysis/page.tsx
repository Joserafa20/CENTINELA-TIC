'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { EmailAnalysisResultView, type EmailAnalysisResult } from '@/components/email/analysis-result';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PageState = 'idle' | 'uploading' | 'polling' | 'done' | 'error';

export default function EmailAnalyzerPage() {
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['eml', 'msg', 'txt'].includes(ext)) {
      setErrorMsg('Unsupported format. Only EML, MSG, and TXT files are accepted.');
      setState('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds 10 MB limit.');
      setState('error');
      return;
    }

    setState('uploading');
    setErrorMsg(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    let analysisId: string;
    try {
      const res = await fetch(`${API_BASE}/v1/email-analysis`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { analysisId: string };
      analysisId = data.analysisId;
    } catch (err) {
      setErrorMsg((err as Error).message);
      setState('error');
      return;
    }

    setState('polling');
    await pollResult(analysisId);
  }

  async function pollResult(id: string, attempts = 0) {
    if (attempts > 30) {
      setErrorMsg('Analysis timed out. Please try again.');
      setState('error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/v1/email-analysis/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as EmailAnalysisResult;
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setResult(data);
        setState('done');
        return;
      }
    } catch {
      // keep polling
    }
    setTimeout(() => pollResult(id, attempts + 1), 1000);
  }

  function reset() {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Analyzer</h1>
        <p className="text-muted-foreground">Upload an EML, MSG, or TXT file for security analysis</p>
      </div>

      {/* Upload zone */}
      {state === 'idle' || state === 'error' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/30'
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">Drop an email file here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">EML · MSG · TXT — max 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,.msg,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      ) : null}

      {/* Error */}
      {state === 'error' && errorMsg && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Loading states */}
      {(state === 'uploading' || state === 'polling') && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-6 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {state === 'uploading' ? 'Uploading…' : 'Analyzing email…'}
          </span>
        </div>
      )}

      {/* Result */}
      {state === 'done' && result && (
        <>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Analysis complete</span>
            <button onClick={reset} className="ml-auto text-xs text-primary hover:underline">
              Analyze another file
            </button>
          </div>
          <EmailAnalysisResultView result={result} />
        </>
      )}
    </div>
  );
}
