'use client';

import { useState, useMemo } from 'react';
import {
  Loader2, AlertTriangle, Wallet, RotateCcw, Landmark,
  CheckCircle2, Download, ChevronRight, Lock,
} from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import ParentTokensResults from '@/components/parent-tokens/ParentTokensResults';
import ValidationErrorAlert from '@/components/ValidationErrorAlert';
import { SOFT_UPLOAD_WARNING_BYTES, formatBytes, downloadBase64File, MIME_CSV, MIME_XLSX } from '@/lib/client-utils';
import type { PTResult } from '@/lib/parent-tokens-logic';
import type { ValidationError } from '@/lib/header-validation';

// ─── Phase result types ────────────────────────────────────────
type Phase1Data = Omit<PTResult, 'noBankingBase64' | 'noBankingFilename'>;
interface Phase2Data {
  noBankingBase64?:  string;
  noBankingFilename?: string;
  summary: { noBankingCount?: number };
}

export default function ParentTokensWorkspace() {
  // ── Files (kept in state so Phase 2 can re-use them) ────────
  const [ppFile,  setPpFile]  = useState<File | null>(null);
  const [dsFile,  setDsFile]  = useState<File | null>(null);
  const [gflFile, setGflFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  // ── Phase results ────────────────────────────────────────────
  const [phase1Result, setPhase1Result] = useState<Phase1Data | null>(null);
  const [phase2Result, setPhase2Result] = useState<Phase2Data | null>(null);

  // ── UI state ─────────────────────────────────────────────────
  const [isP1, setIsP1] = useState(false);
  const [isP2, setIsP2] = useState(false);
  const [p1Error, setP1Error] = useState<string | null>(null);
  const [p2Error, setP2Error] = useState<string | null>(null);
  const [p1ValErrors, setP1ValErrors] = useState<ValidationError[] | null>(null);
  const [p2ValErrors, setP2ValErrors] = useState<ValidationError[] | null>(null);

  const phase1Ready   = !!ppFile && !!dsFile && !!gflFile && !isP1;
  const phase2Unlocked = phase1Result !== null;
  const phase2Ready   = !!bankFile && !isP2;

  const phase1Size = (ppFile?.size ?? 0) + (dsFile?.size ?? 0) + (gflFile?.size ?? 0);
  const showSizeWarn = phase1Size > SOFT_UPLOAD_WARNING_BYTES;

  // ── Phase 1 submit ───────────────────────────────────────────
  async function runPhase1() {
    if (!ppFile || !dsFile || !gflFile) return;
    setIsP1(true);
    setP1Error(null);
    setP1ValErrors(null);

    try {
      const fd = new FormData();
      fd.append('ppFile',  ppFile);
      fd.append('dsFile',  dsFile);
      fd.append('gflFile', gflFile);

      const res  = await fetch('/api/parent-tokens', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.validationErrors) { setP1ValErrors(json.validationErrors); return; }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');

      setPhase1Result(json.data as Phase1Data);
    } catch (err) {
      setP1Error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsP1(false);
    }
  }

  // ── Phase 2 submit ───────────────────────────────────────────
  async function runPhase2() {
    if (!ppFile || !dsFile || !gflFile || !bankFile) return;
    setIsP2(true);
    setP2Error(null);
    setP2ValErrors(null);

    try {
      const fd = new FormData();
      fd.append('ppFile',   ppFile);
      fd.append('dsFile',   dsFile);
      fd.append('gflFile',  gflFile);
      fd.append('bankFile', bankFile);

      const res  = await fetch('/api/parent-tokens/banking', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.validationErrors) { setP2ValErrors(json.validationErrors); return; }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');

      setPhase2Result(json.data as Phase2Data);
    } catch (err) {
      setP2Error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsP2(false);
    }
  }

  function handleReset() {
    setPpFile(null); setDsFile(null); setGflFile(null); setBankFile(null);
    setPhase1Result(null); setPhase2Result(null);
    setP1Error(null); setP2Error(null);
    setP1ValErrors(null); setP2ValErrors(null);
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-teal/10 dark:bg-brand-teal/10 flex items-center justify-center shrink-0">
            <Wallet className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="page-title">Parent Tokens &amp; Banking</h1>
            <p className="page-subtitle">Match payment plans against DS tokens and the guardian list.</p>
          </div>
        </div>
        {(phase1Result || p1Error) && (
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> New run
          </button>
        )}
      </div>

      {/* ── STEP 1 ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <StepHeader step={1} label="Generate Token Import Sheet" done={!!phase1Result} />

        {!phase1Result && (
          <div className="card p-5 fade-in-up">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <FileDropzone label="Payment Plan"          description="payment_plan export"       file={ppFile}  onFileSelect={setPpFile}  required disabled={isP1} compact />
              <FileDropzone label="DS Tokens"             description="DS token list"             file={dsFile}  onFileSelect={setDsFile}  required disabled={isP1} compact />
              <FileDropzone label="Guardian Financial List" description="guardian_financial export" file={gflFile} onFileSelect={setGflFile} required disabled={isP1} compact />
            </div>

            {showSizeWarn && (
              <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Combined upload is {formatBytes(phase1Size)}. If processing fails, split the payment plan into smaller batches.
                </p>
              </div>
            )}

            {p1ValErrors && <div className="mb-4"><ValidationErrorAlert errors={p1ValErrors} /></div>}

            {p1Error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-2.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{p1Error}</p>
              </div>
            )}

            <button onClick={runPhase1} disabled={!phase1Ready} className="btn-primary">
              {isP1
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><Wallet className="w-4 h-4" /> Generate Token Import <ChevronRight className="w-3.5 h-3.5" /></>
              }
            </button>
          </div>
        )}

        {/* Phase 1 results */}
        {phase1Result && <ParentTokensResults result={phase1Result} />}

        {/* ── STEP 2 ────────────────────────────────────────────── */}
        <div className={`transition-all duration-300 ${phase2Unlocked ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={2} label="Generate No Banking Report (optional)" done={!!phase2Result} locked={!phase2Unlocked} />

          {phase2Unlocked && !phase2Result && (
            <div className="card p-5 fade-in-up">
              <div className="flex items-start gap-2.5 mb-4 p-3 rounded-lg bg-brand-teal/5 dark:bg-brand-teal/5 border border-brand-teal/20">
                <CheckCircle2 className="w-4 h-4 text-brand-teal-dark dark:text-brand-teal shrink-0 mt-0.5" />
                <p className="text-xs text-brand-grey-500 dark:text-slate-400 leading-relaxed">
                  Step 1 complete. Upload the parent bank details summary to identify parents with no banking details on file.
                </p>
              </div>

              <div className="mb-4">
                <FileDropzone
                  label="Parent Bank Details Summary"
                  description="parent_bank_details_summary_report"
                  file={bankFile}
                  onFileSelect={setBankFile}
                  required
                  disabled={isP2}
                />
              </div>

              {p2ValErrors && <div className="mb-4"><ValidationErrorAlert errors={p2ValErrors} /></div>}

              {p2Error && (
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-2.5 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{p2Error}</p>
                </div>
              )}

              <button onClick={runPhase2} disabled={!phase2Ready} className="btn-primary">
                {isP2
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Landmark className="w-4 h-4" /> Generate No Banking Report</>
                }
              </button>
            </div>
          )}

          {phase2Result && (
            <div className="card p-5 fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
                <div>
                  <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">No Banking Report ready</p>
                  {phase2Result.summary.noBankingCount !== undefined && (
                    <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5">
                      {phase2Result.summary.noBankingCount} parent{phase2Result.summary.noBankingCount === 1 ? '' : 's'} without banking details
                    </p>
                  )}
                </div>
              </div>
              {phase2Result.noBankingBase64 && phase2Result.noBankingFilename && (
                <button
                  onClick={() => downloadBase64File(phase2Result.noBankingBase64!, phase2Result.noBankingFilename!, MIME_XLSX)}
                  className="btn-download"
                >
                  <Download className="w-3.5 h-3.5" /> {phase2Result.noBankingFilename}
                </button>
              )}
              {!phase2Result.noBankingBase64 && (
                <p className="text-xs text-brand-grey-500 dark:text-slate-400">No parents without banking details found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step header component ──────────────────────────────────────
function StepHeader({ step, label, done, locked }: { step: number; label: string; done?: boolean; locked?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
        ${done    ? 'bg-brand-teal text-white'
        : locked  ? 'bg-brand-grey-100 dark:bg-slate-700 text-brand-grey-300 dark:text-slate-500'
                  : 'bg-brand-purple text-white'}`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : locked ? <Lock className="w-3 h-3" /> : step}
      </div>
      <p className={`text-sm font-semibold transition-colors
        ${done ? 'text-brand-teal-dark dark:text-brand-teal line-through decoration-brand-teal/40'
        : locked ? 'text-brand-grey-300 dark:text-slate-600'
                 : 'text-brand-charcoal dark:text-slate-100'}`}
      >
        {label}
      </p>
      {locked && <Lock className="w-3.5 h-3.5 text-brand-grey-300 dark:text-slate-600" />}
    </div>
  );
}
