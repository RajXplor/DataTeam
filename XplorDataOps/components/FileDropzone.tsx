'use client';

import { useRef, useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '@/lib/client-utils';

interface FileDropzoneProps {
  label: string;
  description?: string;
  accept?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function FileDropzone({
  label,
  description,
  accept = '.csv,.xlsx,.xlsm,.xls',
  file,
  onFileSelect,
  required = false,
  disabled = false,
  compact = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect, disabled],
  );

  const py = compact ? 'py-3' : 'py-5';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-semibold text-brand-charcoal dark:text-slate-200">
          {label}
          {required && <span className="text-brand-pink ml-0.5">*</span>}
        </label>
        {file && (
          <button
            type="button"
            onClick={() => { onFileSelect(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="text-[10px] text-brand-grey-500 dark:text-slate-400 hover:text-brand-pink transition-colors flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {description && !compact && (
        <p className="text-[10px] text-brand-grey-500 dark:text-slate-500 mb-1.5">{description}</p>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed px-3 ${py}
          flex flex-col items-center justify-center text-center gap-1.5
          transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragOver ? 'dropzone-active border-brand-purple' : ''}
          ${file && !isDragOver ? 'border-brand-teal/50 bg-brand-teal/5 dark:bg-brand-teal/5' : ''}
          ${!file && !isDragOver
            ? 'border-brand-grey-300 bg-brand-light-grey2 hover:border-brand-purple/40 hover:bg-brand-purple-muted/30 dark:bg-slate-700/40 dark:border-slate-600 dark:hover:border-brand-purple/50'
            : ''}
        `}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} disabled={disabled} className="hidden" />
        {file ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-brand-teal" />
            <div className="flex items-center gap-1 text-xs font-medium text-brand-charcoal dark:text-slate-200 max-w-full">
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-grey-500 shrink-0" />
              <span className="truncate max-w-[180px]">{file.name}</span>
            </div>
            <span className="text-[10px] text-brand-grey-500 dark:text-slate-400">{formatBytes(file.size)}</span>
          </>
        ) : (
          <>
            <UploadCloud className={`w-5 h-5 transition-colors ${isDragOver ? 'text-brand-purple' : 'text-brand-grey-300 dark:text-slate-500'}`} />
            <p className="text-xs text-brand-grey-500 dark:text-slate-400">
              <span className="text-brand-purple font-medium">Click</span> or drag &amp; drop
            </p>
            <p className="text-[10px] text-brand-grey-300 dark:text-slate-600">CSV, XLSX, XLS</p>
          </>
        )}
      </div>
    </div>
  );
}
