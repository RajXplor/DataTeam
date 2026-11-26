'use client';

import { useState, useMemo } from 'react';
import {
  Loader2, AlertTriangle, FolderInput, RotateCcw, Info,
  CheckCircle2, Upload, Users, UserSquare, BookUser,
} from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import InfocareDResults from '@/components/infocare-d/InfocareDResults';
import type { InfocareDResult } from '@/lib/infocare-d-logic';

// ─── Instructional helpers ────────────────────────────────────

function PathHint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-brand-purple-muted/60 dark:bg-brand-purple/10 border border-brand-purple/15 dark:border-brand-purple/20 px-3 py-2.5 mt-3">
      <Info className="w-3.5 h-3.5 text-brand-purple shrink-0 mt-0.5" />
      <span className="text-[11px] font-mono text-brand-grey-500 dark:text-slate-400 leading-relaxed">{text}</span>
    </div>
  );
}

function ScreenshotPlaceholder({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  return (
    <div className="mt-3 rounded-xl border-2 border-dashed border-brand-grey-200 dark:border-slate-600 overflow-hidden bg-brand-light-grey2/40 dark:bg-slate-800/40 transition-colors hover:border-brand-purple/30">
      <img
        src={src}
        alt={alt}
        onClick={onOpen}
        className="block mx-auto w-full max-w-[900px] max-h-[220px] md:max-h-[300px] object-contain cursor-zoom-in transition-transform duration-150 hover:scale-[1.01]"
      />
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300
      ${done ? 'bg-brand-teal text-white shadow-md' : 'bg-brand-purple text-white shadow-sm'}`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

// ─── Sub-category card (stitch pair) ─────────────────────────

function StitchCard({
  label, note, fileA, setFileA, fileB, setFileB, disabled,
}: {
  label: string; note?: string;
  fileA: File | null; setFileA: (f: File | null) => void;
  fileB: File | null; setFileB: (f: File | null) => void;
  disabled: boolean;
}) {
  const uploaded = (fileA ? 1 : 0) + (fileB ? 1 : 0);
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${uploaded === 2
        ? 'border-brand-teal/40 bg-brand-teal/3 dark:bg-brand-teal/5 shadow-sm'
        : uploaded === 1
        ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/10 shadow-sm'
        : 'border-brand-grey-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-purple/30 hover:shadow-sm'}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div>
          <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 tracking-wide">{label}</p>
          {note && <p className="text-[10px] text-brand-grey-500 dark:text-slate-500 mt-0.5">{note}</p>}
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors duration-200
          ${uploaded === 2 ? 'bg-brand-teal/15 text-brand-teal-dark dark:text-brand-teal'
          : uploaded === 1 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
          : 'bg-brand-grey-100 dark:bg-slate-700/60 text-brand-grey-500 dark:text-slate-500'}`}>
          {uploaded}/2
        </span>
      </div>
      {/* Dropzone pair */}
      <div className="px-4 pb-4 space-y-2">
        <FileDropzone label="← File 1 (left columns)" file={fileA} onFileSelect={setFileA} disabled={disabled} compact />
        <FileDropzone label="→ File 2 (right columns)" file={fileB} onFileSelect={setFileB} disabled={disabled} compact />
      </div>
    </div>
  );
}

// ─── Single-file contact card ─────────────────────────────────

function ContactCard({
  label, file, setFile, disabled,
}: {
  label: string; file: File | null;
  setFile: (f: File | null) => void; disabled: boolean;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${file
        ? 'border-brand-teal/40 bg-brand-teal/3 dark:bg-brand-teal/5 shadow-sm'
        : 'border-brand-grey-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-purple/30 hover:shadow-sm'}`}>
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <p className="text-[11px] font-bold text-brand-charcoal dark:text-slate-200 leading-snug">{label}</p>
        {file && <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0" />}
      </div>
      <div className="px-3.5 pb-3.5">
        <FileDropzone label="" file={file} onFileSelect={setFile} disabled={disabled} compact />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────

function Section({
  step, icon, title, meta, done, children,
}: {
  step: number; icon: React.ReactNode; title: string;
  meta: string; done: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden
      ${done
        ? 'border-brand-teal/30 dark:border-brand-teal/20 shadow-md'
        : 'border-brand-grey-100 dark:border-slate-700 shadow-sm'}`}>
      {/* Section header */}
      <div className={`flex items-center gap-4 px-6 py-4 border-b transition-colors duration-300
        ${done
          ? 'bg-brand-teal/5 dark:bg-brand-teal/10 border-brand-teal/20 dark:border-brand-teal/15'
          : 'bg-brand-light-grey2/60 dark:bg-slate-800/80 border-brand-grey-100 dark:border-slate-700'}`}>
        <StepBadge n={step} done={done} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base">{icon}</span>
          <h2 className="text-sm font-bold text-brand-charcoal dark:text-slate-100 truncate">{title}</h2>
        </div>
        <span className="text-[10px] font-semibold text-brand-grey-500 dark:text-slate-400 bg-white/80 dark:bg-slate-700/80 border border-brand-grey-100 dark:border-slate-600 px-2.5 py-1 rounded-full shrink-0">
          {meta}
        </span>
      </div>
      {/* Section body */}
      <div className="p-5 bg-white dark:bg-slate-800">{children}</div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────

function UploadProgress({ uploaded, total }: { uploaded: number; total: number }) {
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-brand-grey-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-teal transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-brand-grey-500 dark:text-slate-400 tabular-nums shrink-0">
        {uploaded}/{total}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN WORKSPACE
// ─────────────────────────────────────────────────────────────

export default function InfocareDWorkspace() {
  // Children
  const [childCurrentA,  setChildCurrentA]  = useState<File | null>(null);
  const [childCurrentB,  setChildCurrentB]  = useState<File | null>(null);
  const [childWaitlistA, setChildWaitlistA] = useState<File | null>(null);
  const [childWaitlistB, setChildWaitlistB] = useState<File | null>(null);
  const [childPastA,     setChildPastA]     = useState<File | null>(null);
  const [childPastB,     setChildPastB]     = useState<File | null>(null);
  const [childFutureA,   setChildFutureA]   = useState<File | null>(null);
  const [childFutureB,   setChildFutureB]   = useState<File | null>(null);
  // Staff
  const [staffA, setStaffA] = useState<File | null>(null);
  const [staffB, setStaffB] = useState<File | null>(null);
  // Contacts
  const [contactAllPast,    setContactAllPast]    = useState<File | null>(null);
  const [contactAllCurrent, setContactAllCurrent] = useState<File | null>(null);
  const [contactAllFuture,  setContactAllFuture]  = useState<File | null>(null);
  const [contactBpPast,     setContactBpPast]     = useState<File | null>(null);
  const [contactBpCurrent,  setContactBpCurrent]  = useState<File | null>(null);
  const [contactBpFuture,   setContactBpFuture]   = useState<File | null>(null);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [result,       setResult]       = useState<InfocareDResult | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [activeImage,  setActiveImage]  = useState<string | null>(null);

  const allFiles = [
    childCurrentA, childCurrentB, childWaitlistA, childWaitlistB,
    childPastA, childPastB, childFutureA, childFutureB,
    staffA, staffB,
    contactAllPast, contactAllCurrent, contactAllFuture,
    contactBpPast, contactBpCurrent, contactBpFuture,
  ];
  const uploadedCount = useMemo(() => allFiles.filter(Boolean).length, [allFiles]);
  const hasAnyFile    = uploadedCount > 0;
  const childrenDone  = [childCurrentA, childCurrentB, childWaitlistA, childWaitlistB,
                          childPastA, childPastB, childFutureA, childFutureB].some(Boolean);
  const staffDone     = !!(staffA || staffB);
  const contactsDone  = [contactAllPast, contactAllCurrent, contactAllFuture,
                          contactBpPast, contactBpCurrent, contactBpFuture].some(Boolean);

  async function handleSubmit() {
    setIsProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      const a  = (name: string, f: File | null) => { if (f) fd.append(name, f); };
      a('childCurrentA', childCurrentA);   a('childCurrentB', childCurrentB);
      a('childWaitlistA', childWaitlistA); a('childWaitlistB', childWaitlistB);
      a('childPastA', childPastA);         a('childPastB', childPastB);
      a('childFutureA', childFutureA);     a('childFutureB', childFutureB);
      a('staffA', staffA);                 a('staffB', staffB);
      a('contactAllPast', contactAllPast);       a('contactAllCurrent', contactAllCurrent);
      a('contactAllFuture', contactAllFuture);   a('contactBpPast', contactBpPast);
      a('contactBpCurrent', contactBpCurrent);   a('contactBpFuture', contactBpFuture);

      const res  = await fetch('/api/infocare-d', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');
      setResult(json.data as InfocareDResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    [setChildCurrentA, setChildCurrentB, setChildWaitlistA, setChildWaitlistB,
     setChildPastA, setChildPastB, setChildFutureA, setChildFutureB,
     setStaffA, setStaffB, setContactAllPast, setContactAllCurrent, setContactAllFuture,
     setContactBpPast, setContactBpCurrent, setContactBpFuture].forEach(s => s(null));
    setResult(null); setError(null);
  }

  if (result) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <FolderInput className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
          </div>
          <div>
            <h1 className="page-title">📦 Infocare &gt; D Migration</h1>
            <p className="page-subtitle">Export complete — download your import files below.</p>
          </div>
        </div>
        <button onClick={handleReset} className="btn-secondary">
          <RotateCcw className="w-3.5 h-3.5" /> 🔁 New run
        </button>
      </div>
      <InfocareDResults result={result} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* ── Hero header ──────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark flex items-center justify-center shadow-md">
            <FolderInput className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">📦 Infocare &gt; D Migration</h1>
            <p className="page-subtitle">
              Stitch, clean, and export up to 11 import-ready CSV files in one run.
            </p>
          </div>
        </div>
        {/* Upload progress bar */}
        <div className="mt-4 rounded-2xl bg-white dark:bg-slate-800 border border-brand-grey-100 dark:border-slate-700 shadow-sm px-5 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-charcoal dark:text-slate-200">
              Files uploaded
            </span>
            <div className="flex items-center gap-3 text-[11px] font-medium text-brand-grey-500 dark:text-slate-400">
              {childrenDone && <span className="text-brand-teal-dark dark:text-brand-teal">👶 Children ✓</span>}
              {staffDone    && <span className="text-brand-teal-dark dark:text-brand-teal">👩‍🏫 Staff ✓</span>}
              {contactsDone && <span className="text-brand-teal-dark dark:text-brand-teal">📋 Contacts ✓</span>}
            </div>
          </div>
          <UploadProgress uploaded={uploadedCount} total={16} />
        </div>
      </div>

      <div className="space-y-5 fade-in-up">

        {/* ── STEP 1: CHILDREN ────────────────────────────────── */}
        <Section
          step={1} icon="👶" title="Children Files"
          meta="4 categories · 2 files each · horizontal stitch"
          done={childrenDone}
        >
          <PathHint text="Discover Test Center > Stitch Files > Infocare Headers" />
          <ScreenshotPlaceholder
            src="/infocare-children-export-path.jpg"
            alt="Infocare children export path"
            onOpen={() => setActiveImage('/infocare-children-export-path.jpg')}
          />
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <StitchCard
              label="Current"
              fileA={childCurrentA}  setFileA={setChildCurrentA}
              fileB={childCurrentB}  setFileB={setChildCurrentB}
              disabled={isProcessing}
            />
            <StitchCard
              label="Waitlist"
              fileA={childWaitlistA} setFileA={setChildWaitlistA}
              fileB={childWaitlistB} setFileB={setChildWaitlistB}
              disabled={isProcessing}
            />
            <StitchCard
              label="Past"
              note="Auto-filtered to last 12 months by Leaving Date"
              fileA={childPastA}    setFileA={setChildPastA}
              fileB={childPastB}    setFileB={setChildPastB}
              disabled={isProcessing}
            />
            <StitchCard
              label="Future"
              fileA={childFutureA}  setFileA={setChildFutureA}
              fileB={childFutureB}  setFileB={setChildFutureB}
              disabled={isProcessing}
            />
          </div>
        </Section>

        {/* ── STEP 2: STAFF ────────────────────────────────────── */}
        <Section
          step={2} icon="👩‍🏫" title="Staff Files"
          meta="1 category · 2 files · horizontal stitch"
          done={staffDone}
        >
          <PathHint text="Staff Files > Stitch > Format Cols U, AD, AH, AI, AJ, AN, AO, AP > Check Col Q ID Type" />
          <ScreenshotPlaceholder
            src="/infocare-staff-export-path.jpg"
            alt="Infocare staff export path"
            onOpen={() => setActiveImage('/infocare-staff-export-path.jpg')}
          />
          <div className="mt-4 max-w-sm">
            <StitchCard
              label="Staff"
              fileA={staffA} setFileA={setStaffA}
              fileB={staffB} setFileB={setStaffB}
              disabled={isProcessing}
            />
          </div>
        </Section>

        {/* ── STEP 3: CONTACTS ─────────────────────────────────── */}
        <Section
          step={3} icon="📋" title="Contact Files"
          meta="6 categories · single file each"
          done={contactsDone}
        >
          <PathHint text="Format Cols E, I, O > Remove Unlinked Contacts" />
          <ScreenshotPlaceholder
            src="/infocare-contact-export-path.jpg"
            alt="Infocare contacts export path"
            onOpen={() => setActiveImage('/infocare-contact-export-path.jpg')}
          />

          <div className="mt-4 space-y-4">
            {/* Contact All row */}
            <div>
              <p className="text-[11px] font-bold text-brand-grey-500 dark:text-slate-400 uppercase tracking-widest mb-2.5 px-0.5">
                Contact — All
              </p>
              <div className="grid grid-cols-3 gap-3">
                <ContactCard label="Past"    file={contactAllPast}    setFile={setContactAllPast}    disabled={isProcessing} />
                <ContactCard label="Current" file={contactAllCurrent} setFile={setContactAllCurrent} disabled={isProcessing} />
                <ContactCard label="Future"  file={contactAllFuture}  setFile={setContactAllFuture}  disabled={isProcessing} />
              </div>
            </div>
            {/* Contact Bill Payer row */}
            <div>
              <p className="text-[11px] font-bold text-brand-grey-500 dark:text-slate-400 uppercase tracking-widest mb-2.5 px-0.5">
                Contact — Bill Payer
              </p>
              <div className="grid grid-cols-3 gap-3">
                <ContactCard label="Past"    file={contactBpPast}     setFile={setContactBpPast}     disabled={isProcessing} />
                <ContactCard label="Current" file={contactBpCurrent}  setFile={setContactBpCurrent}  disabled={isProcessing} />
                <ContactCard label="Future"  file={contactBpFuture}   setFile={setContactBpFuture}   disabled={isProcessing} />
              </div>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-brand-grey-500 dark:text-slate-400">
            <Info className="w-3 h-3 text-brand-purple shrink-0" />
            Upload Children files above to enable contact cross-reference filtering.
          </p>
        </Section>

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-brand-grey-100 dark:border-slate-700 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-brand-charcoal dark:text-slate-100">
                Ready to generate?
              </p>
              <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5">
                {uploadedCount > 0
                  ? `${uploadedCount} file${uploadedCount !== 1 ? 's' : ''} uploaded — click to process and download.`
                  : 'Upload at least one file above to continue.'}
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!hasAnyFile || isProcessing}
              className="btn-primary rounded-xl px-6 py-3 text-base font-bold shrink-0 w-full sm:w-auto justify-center"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> ⚙️ Processing…</>
              ) : (
                <><Upload className="w-4.5 h-4.5" /> ✨ Generate All Import Files</>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setActiveImage(null)}>
          <div className="relative max-h-[90vh] max-w-[95vw] rounded-xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white shadow-lg hover:bg-slate-700"
              aria-label="Close enlarged image"
            >
              ×
            </button>
            <img src={activeImage} alt="Enlarged Infocare export path" className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
