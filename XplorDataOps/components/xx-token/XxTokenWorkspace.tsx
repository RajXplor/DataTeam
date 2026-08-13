'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, KeyRound, RotateCcw, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import XxTokenResults from '@/components/xx-token/XxTokenResults';
import ValidationErrorAlert from '@/components/ValidationErrorAlert';
import { SOFT_UPLOAD_WARNING_BYTES, formatBytes } from '@/lib/client-utils';
import type { XxTokenResult } from '@/lib/xx-token-logic';
import type { ValidationError } from '@/lib/header-validation';

// ─── Reusable helper UI components (presentation only) ────────

/** Subtle navigation path hint shown below a dropzone */
function PathHint({ text }: { text: string }) {
  return (
    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-brand-light-grey2 dark:bg-slate-700/40 border border-brand-grey-100 dark:border-slate-600 px-2.5 py-2">
      <Info className="w-3 h-3 text-brand-purple shrink-0 mt-px" />
      <span className="text-[11px] font-mono text-brand-grey-500 dark:text-slate-400 leading-relaxed">
        {text}
      </span>
    </div>
  );
}

/** Swappable screenshot placeholder — replace src with your actual image path */
function ScreenshotPlaceholder({ src, alt, onOpen }: { src: string; alt: string; onOpen?: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-brand-grey-300 dark:border-slate-600 overflow-hidden bg-brand-light-grey2/60 dark:bg-slate-800/60 p-2">
      <div className="overflow-auto rounded-md bg-white/40 dark:bg-slate-900/20">
        <img
          src={src}
          alt={alt}
          onClick={onOpen}
          className="block mx-auto w-full max-w-[900px] max-h-[220px] md:max-h-[300px] object-contain rounded-md shadow-sm cursor-zoom-in transition-transform duration-150 hover:scale-[1.01]"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export default function XxTokenWorkspace() {
  const [childFile, setChildFile] = useState<File | null>(null);
  const [tokenFile, setTokenFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing]         = useState(false);
  const [result, setResult]                     = useState<XxTokenResult | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const canSubmit       = !!childFile && !!tokenFile && !isProcessing;
  const combinedSize    = (childFile?.size ?? 0) + (tokenFile?.size ?? 0);
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
            <h1 className="page-title">🔑 X&gt;X Token Import</h1>
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
          {/* File uploads — each column contains its dropzone + instructional helper */}
          <div className="grid sm:grid-cols-2 gap-5 mb-5">

            {/* Child Details */}
            <div>
              <FileDropzone
                label="👶 Child Details"
                description="File containing parent legacy IDs — CSV or Excel"
                file={childFile}
                onFileSelect={setChildFile}
                required
                disabled={isProcessing}
              />
              <PathHint text="Ensure you are in the new (Imported) centre: Profiles > Children > Filter Active + Waitlist > Export > Master CSV" />
              <ScreenshotPlaceholder
                src="/xx-token-child-export.png"
                alt="Screenshot: export Child Details from the imported centre in Xplor"
                onOpen={() => setActiveImage('/xx-token-child-export.png')}
              />
            </div>

            {/* DS Tokens — text note only, no image */}
            <div>
              <FileDropzone
                label="🪙 DS Tokens"
                description="File with Club Number → Token mapping"
                file={tokenFile}
                onFileSelect={setTokenFile}
                required
                disabled={isProcessing}
              />
              <PathHint text="Note: This is extracted by the Payments team." />
            </div>

          </div>

          {/* Column detection info */}
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
          {activeImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setActiveImage(null)}>
              <div className="relative max-h-[90vh] max-w-[95vw] rounded-xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setActiveImage(null)} className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white shadow-lg hover:bg-slate-700" aria-label="Close enlarged image">×</button>
                <img src={activeImage} alt="Enlarged screenshot" className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain" />
              </div>
            </div>
          )}
    </div>
  );
}
