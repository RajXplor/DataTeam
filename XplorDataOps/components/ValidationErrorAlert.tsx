'use client';

import { ShieldAlert } from 'lucide-react';
import type { ValidationError } from '@/lib/header-validation';

export default function ValidationErrorAlert({ errors }: { errors: ValidationError[] }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-4 dark:bg-red-950/20 dark:border-red-800 fade-in-up">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3">
            File validation failed — wrong file uploaded
          </p>
          <div className="space-y-3">
            {errors.map((err, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                  {err.file}
                </p>
                <p className="text-[10px] text-red-600 dark:text-red-500 mb-1">
                  Missing required columns ({err.missing.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {err.missing.map((h) => (
                    <code
                      key={h}
                      className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-mono border border-red-200 dark:border-red-800"
                    >
                      {h}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
