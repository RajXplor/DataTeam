'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, AlertTriangle, Compass, RotateCcw, Info } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import D2DStaffResults from '@/components/d2d-staff/D2DStaffResults';
import ValidationErrorAlert from '@/components/ValidationErrorAlert';
import { SOFT_UPLOAD_WARNING_BYTES, formatBytes } from '@/lib/client-utils';
import type { D2DStaffResult } from '@/lib/d2d-staff-logic';
import type { ValidationError } from '@/lib/header-validation';

// ─── Instructional helper components (UI-only) ────────────────

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

export default function D2DStaffWorkspace() {
  const [staffFile, setStaffFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing]         = useState(false);
  const [result, setResult]                     = useState<D2DStaffResult | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [activeImage, setActiveImage]           = useState<string | null>(null);

  const canSubmit      = !!staffFile && !isProcessing;
  const showSizeWarn   = (staffFile?.size ?? 0) > SOFT_UPLOAD_WARNING_BYTES;

  async function handleSubmit() {
    if (!staffFile) return;
    setIsProcessing(true);
    setError(null);
    setValidationErrors(null);

    try {
      const fd = new FormData();
      fd.append('staffFile', staffFile);

      const res  = await fetch('/api/d2d-staff', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.validationErrors) { setValidationErrors(json.validationErrors); return; }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');

      setResult(json.data as D2DStaffResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    setStaffFile(null);
    setResult(null);
    setError(null);
    setValidationErrors(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Image
              src="/Discover_Icon_Color.png"
              alt="D>D Staff"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="page-title">D &gt; D Staff</h1>
            <p className="page-subtitle">Transform Staff Report to Discover Import Template.</p>
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
          {/* File dropzone + instructional helper */}
          <div className="mb-5">
            <FileDropzone
              label="📋 Extracted Staff File"
              description="Staff export from Discover — CSV/XLSX/XLS"
              file={staffFile}
              onFileSelect={setStaffFile}
              required
              disabled={isProcessing}
            />
            <div className="mt-2.5 rounded-lg bg-brand-light-grey2 dark:bg-slate-700/40 border border-brand-grey-100 dark:border-slate-600 px-4 py-3.5">
              <p className="text-xs text-brand-grey-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 font-mono">
                <Info className="w-7 h-7 text-brand-purple" />
                <p>Reports &gt; Staff Reports &gt; Staff Details &gt; Report Fields &gt; Sort Order = First Name Ascending &gt; Orientation = Portrait &gt; Get Report &gt; Copy to Clipboard &gt; Paste into Excel and Save
                </p>
              </p>
              <p className="text-xs font-semibold text-brand-charcoal dark:text-slate-200 mb-3">
                Report Fields to Select
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">1) Address</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">2) Birthdate</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">3) Daytime Phone</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">4) Emergency Day Phone</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">5) Emergency Mobile</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">6) Emergency Name</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">7) Ethnicity</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">8) First Aid Expiry</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">9) Full Time Staff</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">10) Gender</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">11) Highest Qual</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">12) Leaving Date</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">13) Mobile</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">14) Paid Staff</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">15) Payroll ID</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">16) Permanent Staff</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">17) Personal Email</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">18) Police Check Expiry</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">19) Post Code</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">20) Role</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">21) Start Date</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">22) Teacher Cert</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">23) Teacher Cert Expiry</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">24) Teacher Cert Number</p>
              </div>
              
            </div>
            <ScreenshotPlaceholder
              src="/placeholder-d2d-staff.png"
              alt="Screenshot: how to extract the staff file from Discover"
              onOpen={() => setActiveImage('/placeholder-d2d-staff.png')}
            />
          </div>

          {showSizeWarn && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                File is {formatBytes(staffFile?.size ?? 0)}. If processing fails, try splitting into smaller batches.
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
              <><Compass className="w-4 h-4" /> ✨ Generate Import File</>
            )}
          </button>
        </div>
      )}

      {result && <D2DStaffResults result={result} />}
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
