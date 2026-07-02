'use client';

import {
  CheckCircle2, Download, Users, Hash, AlertCircle,
  ListChecks, Columns, KeyRound,
} from 'lucide-react';
import { downloadBase64File, MIME_CSV } from '@/lib/client-utils';
import DataTable from '@/components/DataTable';
import type { XxTokenResult } from '@/lib/xx-token-logic';

export default function XxTokenResults({ result }: { result: XxTokenResult }) {
  const { summary, detectedColumns, missingRows } = result;

  const toneClass: Record<string, string> = {
    neutral: 'text-brand-charcoal dark:text-slate-200',
    good:    'text-brand-teal-dark dark:text-brand-teal',
    alert:   'text-brand-pink',
  };

  const stats = [
    { label: 'Child records',  value: summary.childRecords,  icon: Users,         tone: 'neutral' },
    { label: 'Rows exported',  value: summary.rowsExported,  icon: CheckCircle2,  tone: 'good'    },
    { label: 'Missing tokens', value: summary.missingTokens, icon: AlertCircle,
      tone: summary.missingTokens > 0 ? 'alert' : 'good' },
  ];

  const detectedCols = [
    { label: 'Parent 1 Legacy ID', value: detectedColumns.parent1Legacy },
    { label: 'Parent 1 ID',        value: detectedColumns.parent1Id     },
    { label: 'Parent 2 Legacy ID', value: detectedColumns.parent2Legacy },
    { label: 'Parent 2 ID',        value: detectedColumns.parent2Id     },
  ];

  return (
    <div className="space-y-4 fade-in-up">
      {/* Download banner */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-teal/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">Token import ready 🎉</p>
            <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5 font-mono">{result.filename}</p>
          </div>
        </div>
        <button
          onClick={() => downloadBase64File(result.csvBase64, result.filename, MIME_CSV)}
          className="btn-primary"
        >
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">Summary</p>
        </div>
        {/* Service name row */}
        <div className="px-5 py-3.5 border-b border-brand-grey-100 dark:border-slate-700 flex items-center gap-3">
          <KeyRound className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400 shrink-0" />
          <div>
            <p className="text-[10px] text-brand-grey-500 dark:text-slate-400 uppercase tracking-widest font-semibold">Service</p>
            <p className="text-base font-bold text-brand-charcoal dark:text-slate-100 mt-0.5">{summary.serviceName}</p>
          </div>
        </div>
        {/* Numeric stats */}
        <div className="grid grid-cols-3 divide-x divide-brand-grey-100 dark:divide-slate-700">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="px-5 py-4">
                <Icon className={`w-3.5 h-3.5 mb-2 ${toneClass[s.tone]}`} strokeWidth={2} />
                <p className={`text-2xl font-bold tabular-nums ${toneClass[s.tone]}`}>{s.value}</p>
                <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detected columns */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Columns className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">🔍 Auto-detected columns</p>
        </div>
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-3">
          {detectedCols.map((c) => (
            <div key={c.label} className="flex items-center gap-2.5">
              <span className="text-xs text-brand-grey-500 dark:text-slate-400 w-36 shrink-0">{c.label}</span>
              <code className="text-xs bg-brand-light-grey2 dark:bg-slate-700 px-2 py-0.5 rounded text-brand-charcoal dark:text-slate-200 font-mono border border-brand-grey-100 dark:border-slate-600 truncate max-w-[180px]">
                {c.value}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Missing tokens DataTable */}
      {missingRows.length > 0 && (
        <DataTable
          title="Missing tokens — legacy ID not in DS Tokens file"
          subtitle="These parents were skipped. Verify their Club Number exists in the DS Tokens file."
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          badge="missing"
          columns={[
            { key: 'parentSlot',   header: 'Parent Slot', icon: <Hash className="w-3 h-3" /> },
            { key: 'parentLegacy', header: 'Legacy ID',   mono: true                          },
          ]}
          rows={missingRows.map((r) => ({ parentSlot: r.parentSlot, parentLegacy: r.parentLegacy }))}
        />
      )}

      {/* All matched */}
      {missingRows.length === 0 && (
        <div className="card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
          <p className="text-sm text-brand-grey-500 dark:text-slate-400">
            All parent legacy IDs matched — zero missing tokens. ✅
          </p>
        </div>
      )}
    </div>
  );
}
