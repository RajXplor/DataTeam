'use client';

import { Download, CheckCircle2, FileText, ListChecks } from 'lucide-react';
import { downloadBase64File, MIME_CSV } from '@/lib/client-utils';
import type { InfocareDResult } from '@/lib/infocare-d-logic';

const CATEGORY_LABELS: Record<string, string> = {
  ChildrenCurrent:          '👶 Children Current',
  ChildrenWaitlist:         '👶 Children Waitlist',
  ChildrenPast:             '👶 Children Past (last 12 months)',
  ChildrenFuture:           '👶 Children Future',
  Staff:                    '👩‍🏫 Staff',
  ContactAllPast:           '📋 Contact All — Past',
  ContactAllCurrent:        '📋 Contact All — Current',
  ContactAllFuture:         '📋 Contact All — Future',
  ContactBillPayerPast:     '📋 Contact Bill Payer — Past',
  ContactBillPayerCurrent:  '📋 Contact Bill Payer — Current',
  ContactBillPayerFuture:   '📋 Contact Bill Payer — Future',
};

export default function InfocareDResults({ result }: { result: InfocareDResult }) {
  const { files } = result;
  const totalRows = files.reduce((sum, f) => sum + f.rowCount, 0);

  return (
    <div className="space-y-4 fade-in-up">
      {/* Banner */}
      <div className="card p-4 flex items-center gap-3 border-brand-teal/30">
        <div className="w-9 h-9 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark dark:text-brand-teal" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">
            {files.length} import file{files.length !== 1 ? 's' : ''} ready 🎉
          </p>
          <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5">
            {totalRows.toLocaleString()} total data rows across all files
          </p>
        </div>
      </div>

      {/* Summary grid */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">Generated files</p>
        </div>
        <div className="divide-y divide-brand-grey-100 dark:divide-slate-700">
          {files.map((f) => {
            const key     = f.filename.replace('_Import.csv', '');
            const display = CATEGORY_LABELS[key] ?? key;
            return (
              <div
                key={f.filename}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-brand-light-grey2/60 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-brand-grey-300 dark:text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal dark:text-slate-200 truncate">
                      {display}
                    </p>
                    <p className="text-[11px] text-brand-grey-500 dark:text-slate-400 font-mono mt-0.5">
                      {f.filename} &middot; {f.rowCount.toLocaleString()} rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadBase64File(f.csvBase64, f.filename, MIME_CSV)}
                  className="btn-download ml-4 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download all note */}
      <p className="text-xs text-brand-grey-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal-dark dark:text-brand-teal shrink-0" />
        All files use UTF-8 BOM CSV format with the 5-row preamble + import header structure.
      </p>
    </div>
  );
}
