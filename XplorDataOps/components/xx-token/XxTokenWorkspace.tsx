'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, KeyRound, RotateCcw } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import XxTokenResults from '@/components/xx-token/XxTokenResults';
import ValidationErrorAlert from '@/components/ValidationErrorAlert';
import { SOFT_UPLOAD_WARNING_BYTES, formatBytes } from '@/lib/client-utils';
import type { XxTokenResult } from '@/lib/xx-token-logic';
import type { ValidationError } from '@/lib/header-validation';

export default function XxTokenWorkspace() {
  const [childFile, setChildFile] = useState<File | null>(null);
  const [tokenFile, setTokenFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing]         = useState(false);
  const [result, setResult]                     = useState<XxTokenResult | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);

  const canSubmit      = !!childFile && !!tokenFile && !isProcessing;
  const combinedSize   = (childFile?.size ?? 0) + (tokenFile?.size ?? 0);
  const showSizeWarning = combinedSize > SOFT_UPLOAD_WARNING_BYTES;

  async function handleSubmit() {
    if (!childFile || !tokenFile) return;
    setIsProcessing(true);
    setError(null);
    setValidationErrors(null);

    try {
      const fd = new FormData();
      fd.append('childFile', childFile);
      fd.append('tokenFile', tokenFile);

      const res  = await fetch('/api/xx-token', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.validationErrors) { setValidationErrors(json.validationErrors); return; }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');

      setResult(json.data as XxTokenResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    setChildFile(null);
    setTokenFile(null);
    setResult(null);
    setError(null);
    setValidationErrors(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-lime/20 dark:bg-brand-lime/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-4.5 h-4.5 text-brand-lime" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="page-title">💸 X&gt;X Token Import</h1>
            <p className="page-subtitle">Match parent legacy IDs to their tokens — instantly.</p>
          </div>
        </div>
        {result && (
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> 🔁 New run
          </button>
        )}
      </div>

      {!result && (
        <div className="card p-5 fade-in-up">
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <FileDropzone
              label="👶 Child Details"
              description="File containing parent legacy IDs — CSV or Excel"
              file={childFile}
              onFileSelect={setChildFile}
              required
              disabled={isProcessing}
            />
            <FileDropzone
              label="🪙 DS Tokens"
              description="File with Club Number → Token mapping"
              file={tokenFile}
              onFileSelect={setTokenFile}
              required
              disabled={isProcessing}
            />
          </div>

          <div className="mb-5 rounded-xl bg-brand-light-grey2 dark:bg-slate-700/40 border border-brand-grey-100 dark:border-slate-600 px-4 py-3.5">
            <p className="text-xs font-semibold text-brand-charcoal dark:text-slate-200 mb-1.5">
              🔍 How column detection works
            </p>
            <p className="text-xs text-brand-grey-500 dark:text-slate-400 leading-relaxed">
              Parent legacy and ID columns are auto-detected by fuzzy name matching — the exact same
              logic as the original Python script. The tool looks for variants of{' '}
              <code className="bg-white dark:bg-slate-600 px-1 rounded text-[10px]">Parent Legacy ID 1/2</code>,{' '}
              <code className="bg-white dark:bg-slate-600 px-1 rounded text-[10px]">ParentID 1/2</code>, etc.
              Detected column names are shown in the results for verification.
            </p>
          </div>

          {showSizeWarning && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Combined upload is {formatBytes(combinedSize)}. If processing fails, split the Child Details into smaller batches.
              </p>
            </div>
          )}

          {validationErrors && (
            <div className="mb-4">
              <ValidationErrorAlert errors={validationErrors} />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-2.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> ⚙️ Processing…</>
            ) : (
              <><KeyRound className="w-4 h-4" /> ✨ Generate Token Import</>
            )}
          </button>
        </div>
      )}

      {result && <XxTokenResults result={result} />}
    </div>
  );
}
