'use client';

import { useState, useRef } from 'react';
import { Upload, FileSearch, Loader2, Eye, EyeOff } from 'lucide-react';
import { FileAnalysisResultView, type FileAnalysisResult } from '@/components/file/file-analysis-result';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PageState = 'idle' | 'uploading' | 'polling' | 'done' | 'error';

const ACCEPTED_EXTENSIONS = '.exe,.dll,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.tgz,.js,.vbs,.ps1,.bat,.cmd,.hta,.wsf,.jar,.apk,.swf,.rtf,.msg';

export default function FileAnalyzerPage() {
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<FileAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setState('uploading');
    setErrorMsg(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);
    if (password) form.append('password', password);

    let analysisId: string;
    try {
      const res = await fetch(`${API_BASE}/v1/file-analysis`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
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
    if (attempts > 60) {
      setErrorMsg('Analysis timed out. The file may be too large or the scanner is busy.');
      setState('error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/v1/file-analysis/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as FileAnalysisResult;
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setResult(data);
        setState('done');
        return;
      }
    } catch { /* keep polling */ }
    setTimeout(() => pollResult(id, attempts + 1), 1500);
  }

  function reset() {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    setFileName(null);
    setPassword('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">File Analyzer</h1>
        <p className="text-muted-foreground">ClamAV + YARA + structural inspection for suspicious files</p>
      </div>

      {/* Upload zone */}
      {(state === 'idle' || state === 'error') && (
        <div className="space-y-4">
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
            <p className="text-sm font-medium">Drop a file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">EXE · PDF · Office · ZIP · RAR · PS1 · JS — max 50 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Optional password for encrypted archives */}
          <div className="flex items-center gap-2 max-w-sm">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Archive password (optional):</label>
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank if not encrypted"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && errorMsg && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Loading */}
      {(state === 'uploading' || state === 'polling') && (
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card px-4 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {state === 'uploading' ? 'Uploading…' : 'Scanning file…'}
            </p>
            {fileName && <p className="text-xs text-muted-foreground mt-1">{fileName}</p>}
            {state === 'polling' && (
              <p className="text-xs text-muted-foreground mt-2">Running ClamAV + YARA + structural checks</p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {state === 'done' && result && (
        <>
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Analysis complete</span>
            <button onClick={reset} className="ml-auto text-xs text-primary hover:underline">
              Analyze another file
            </button>
          </div>
          <FileAnalysisResultView result={result} />
        </>
      )}
    </div>
  );
}
