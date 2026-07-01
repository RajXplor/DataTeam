'use client';

import { useState, useMemo } from 'react';
import { Loader2, AlertTriangle, ArrowLeftRight, RotateCcw, Hash, Building2 } from 'lucide-react';
import FileDropzone from '@/components/FileDropzone';
import X2XResults from '@/components/x2x/X2XResults';
import ValidationErrorAlert from '@/components/ValidationErrorAlert';
import { SOFT_UPLOAD_WARNING_BYTES, formatBytes } from '@/lib/client-utils';
import type { X2XResult } from '@/lib/x2x-logic';
import type { ValidationError } from '@/lib/header-validation';

export default function X2XWorkspace() {
  const [childrenFile, setChildrenFile] = useState<File | null>(null);
  const [ecFile, setEcFile]             = useState<File | null>(null);
  const [serviceId, setServiceId]       = useState('');
  const [serviceName, setServiceName]   = useState('');

  const [isProcessing, setIsProcessing]     = useState(false);
  const [result, setResult]                 = useState<X2XResult | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);

  const combinedSize = (childrenFile?.size ?? 0) + (ecFile?.size ?? 0);
  const showSizeWarning = combinedSize > SOFT_UPLOAD_WARNING_BYTES;

  const canSubmit = useMemo(
    () => !!childrenFile && !!ecFile && serviceId.trim() !== '' && serviceName.trim() !== '' && !isProcessing,
    [childrenFile, ecFile, serviceId, serviceName, isProcessing],
  );

  async function handleSubmit() {
    if (!childrenFile || !ecFile) return;
    setIsProcessing(true);
    setError(null);
    setValidationErrors(null);

    try {
      const fd = new FormData();
      fd.append('childrenFile', childrenFile);
      fd.append('ecFile', ecFile);
      fd.append('serviceId', serviceId.trim());
      fd.append('serviceName', serviceName.trim());

      const res  = await fetch('/api/x2x', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.validationErrors) {
        setValidationErrors(json.validationErrors);
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Processing failed.');

      setResult(json.data as X2XResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    setChildrenFile(null);
    setEcFile(null);
    setServiceId('');
    setServiceName('');
    setResult(null);
    setError(null);
    setValidationErrors(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-purple-muted dark:bg-brand-purple/20 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-4.5 h-4.5 text-brand-purple" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="page-title">X2X Migration</h1>
            <p className="page-subtitle">Build a Parent/Child import file from source exports.</p>
          </div>
        </div>
        {result && (
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> New run
          </button>
        )}
      </div>

      {!result && (
        <div className="card p-5 fade-in-up">
          {/* File uploads */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <FileDropzone
              label="Children Data Master"
              description="child_data_master export — CSV or Excel"
              file={childrenFile}
              onFileSelect={setChildrenFile}
              required
              disabled={isProcessing}
            />
            <FileDropzone
              label="Emergency Contact Reports"
              description="Emergency_contact_reports export"
              file={ecFile}
              onFileSelect={setEcFile}
              required
              disabled={isProcessing}
            />
          </div>

          {/* Service details */}
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-brand-charcoal dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-brand-grey-500" />
                New Service ID <span className="text-brand-pink">*</span>
              </label>
              <input
                type="text"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={isProcessing}
                placeholder="e.g. 4821"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-charcoal dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-grey-500" />
                New Service Name <span className="text-brand-pink">*</span>
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                disabled={isProcessing}
                placeholder="e.g. Larmenier OSHC"
                className="input-base"
              />
            </div>
          </div>

          {/* Warnings */}
          {showSizeWarning && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Combined upload is {formatBytes(combinedSize)}. Vercel caps responses at ~4.5 MB — if processing fails, split the Children Data Master by class or room.
              </p>
            </div>
          )}

          {validationErrors && (
            <div className="mb-4">
              <ValidationErrorAlert errors={validationErrors} />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><ArrowLeftRight className="w-4 h-4" /> Generate import file</>
            )}
          </button>
        </div>
      )}

      {result && <X2XResults result={result} />}
    </div>
  );
}
