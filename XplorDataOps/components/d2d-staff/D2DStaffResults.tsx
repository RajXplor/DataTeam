'use client';

import { CheckCircle2, Download, Users, AlertCircle, ListChecks, Hash } from 'lucide-react';
import { downloadBase64File, MIME_CSV } from '@/lib/client-utils';
import DataTable from '@/components/DataTable';
import type { D2DStaffResult } from '@/lib/d2d-staff-logic';

export default function D2DStaffResults({ result }: { result: D2DStaffResult }) {
  const { summary, skipped } = result;

  const toneClass: Record<string, string> = {
    neutral: 'text-brand-charcoal dark:text-slate-200',
    good:    'text-brand-teal-dark dark:text-brand-teal',
    warn:    'text-amber-600 dark:text-amber-400',
  };

  const stats = [
    { label: 'Input rows',    value: summary.inputRows,   icon: Users,         tone: 'neutral' },
    { label: 'Output rows',   value: summary.outputRows,  icon: CheckCircle2,  tone: 'good'    },
    { label: 'Flagged rows',  value: summary.skippedRows, icon: AlertCircle,
      tone: summary.skippedRows > 0 ? 'warn' : 'good' },
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
            <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">
              Import file ready 🎉
            </p>
            <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5 font-mono">
              {result.filename}
            </p>
          </div>
        </div>
        <button
          onClick={() => downloadBase64File(result.csvBase64, result.filename, MIME_CSV)}
          className="btn-primary"
        >
          <Download className="w-3.5 h-3.5" /> Download Import CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">Summary</p>
        </div>
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

      {/* Flagged rows (blank name) — shown as advisory, they ARE included in the output */}
      {skipped.length > 0 && (
        <DataTable
          title="Flagged rows — blank Staff Name"
          subtitle="These rows are included in the import file with an empty Staff Name. Review before uploading."
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          badge="warning"
          columns={[
            { key: 'rowIndex', header: 'Source Row', mono: true, icon: <Hash className="w-3 h-3" /> },
            { key: 'reason',   header: 'Note' },
          ]}
          rows={skipped.map((r) => ({ rowIndex: r.rowIndex, reason: r.reason }))}
        />
      )}

      {/* All clean */}
      {skipped.length === 0 && (
        <div className="card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
          <p className="text-sm text-brand-grey-500 dark:text-slate-400">
            All {summary.outputRows} staff records transformed successfully — no blank names. ✅
          </p>
        </div>
      )}
    </div>
  );
}
