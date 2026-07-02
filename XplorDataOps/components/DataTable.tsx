'use client';

import {
  Trash2, Edit3, UserPlus, AlertTriangle, XCircle, Shuffle,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from 'lucide-react';
import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'deleted'
  | 'cleared'
  | 'created'
  | 'missing'
  | 'error'
  | 'mismatch'
  | 'warning';

export interface TableColumn {
  key: string;
  header: string;
  icon?: React.ReactNode;
  mono?: boolean;
  width?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface DataTableProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge: BadgeVariant;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

// ─────────────────────────────────────────────────────────────
// BADGE CONFIG
// ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
  BadgeVariant,
  { label: string; icon: React.ReactNode; pill: string; rowBg: string; darkRowBg: string }
> = {
  deleted: {
    label: 'DELETED',
    icon: <Trash2 className="w-3 h-3" />,
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800',
    rowBg: 'bg-red-50/40',
    darkRowBg: 'dark:bg-red-950/20',
  },
  cleared: {
    label: 'CLEARED',
    icon: <Edit3 className="w-3 h-3" />,
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
    rowBg: 'bg-amber-50/40',
    darkRowBg: 'dark:bg-amber-950/20',
  },
  created: {
    label: 'AUTO-CREATED',
    icon: <UserPlus className="w-3 h-3" />,
    pill: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800',
    rowBg: 'bg-orange-50/40',
    darkRowBg: 'dark:bg-orange-950/20',
  },
  missing: {
    label: 'MISSING',
    icon: <AlertTriangle className="w-3 h-3" />,
    pill: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800',
    rowBg: 'bg-yellow-50/40',
    darkRowBg: 'dark:bg-yellow-950/20',
  },
  error: {
    label: 'ERROR',
    icon: <XCircle className="w-3 h-3" />,
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800',
    rowBg: 'bg-red-50/40',
    darkRowBg: 'dark:bg-red-950/20',
  },
  mismatch: {
    label: 'MISMATCH',
    icon: <Shuffle className="w-3 h-3" />,
    pill: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-400 dark:border-pink-800',
    rowBg: 'bg-pink-50/40',
    darkRowBg: 'dark:bg-pink-950/20',
  },
  warning: {
    label: 'WARNING',
    icon: <AlertTriangle className="w-3 h-3" />,
    pill: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800',
    rowBg: 'bg-yellow-50/40',
    darkRowBg: 'dark:bg-yellow-950/20',
  },
};

// ─────────────────────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (dir === 'asc') return <ChevronUp className="w-3 h-3 text-brand-purple" />;
  if (dir === 'desc') return <ChevronDown className="w-3 h-3 text-brand-purple" />;
  return <ChevronsUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function DataTable({
  title,
  subtitle,
  icon,
  badge,
  columns,
  rows,
  emptyMessage = 'No records.',
}: DataTableProps) {
  const cfg = BADGE_CONFIG[badge];
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAll, setShowAll] = useState(false);

  const INITIAL_ROWS = 50;

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = String(a[sortKey] ?? '');
    const bv = String(b[sortKey] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const visible = showAll ? sorted : sorted.slice(0, INITIAL_ROWS);
  const hasMore = sorted.length > INITIAL_ROWS;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-brand-grey-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-brand-grey-500 dark:text-slate-400">{icon}</span>}
          <div>
            <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">{title}</p>
            {subtitle && (
              <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase px-2 py-1 rounded-full border ${cfg.pill}`}
        >
          {cfg.icon}
          {cfg.label}
          <span className="ml-1 opacity-70">×{rows.length}</span>
        </span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-brand-grey-500 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-700/80 border-b border-brand-grey-100 dark:border-slate-600">
                    {/* Status column */}
                    <th className="px-3 py-2.5 text-left font-semibold text-brand-grey-500 dark:text-slate-400 whitespace-nowrap w-28">
                      Status
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="group px-3 py-2.5 text-left font-semibold text-brand-grey-500 dark:text-slate-400 whitespace-nowrap cursor-pointer select-none hover:text-brand-charcoal dark:hover:text-slate-100 transition-colors"
                        style={{ width: col.width }}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.icon && <span className="opacity-60">{col.icon}</span>}
                          {col.header}
                          <SortIcon dir={sortKey === col.key ? sortDir : null} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-grey-100 dark:divide-slate-700">
                  {visible.map((row, ridx) => (
                    <tr
                      key={ridx}
                      className={`${cfg.rowBg} ${cfg.darkRowBg} hover:brightness-95 dark:hover:brightness-110 transition-all duration-100`}
                    >
                      {/* Badge cell */}
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.pill}`}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2 text-brand-charcoal dark:text-slate-200 whitespace-nowrap max-w-xs truncate ${
                            col.mono ? 'font-mono' : ''
                          }`}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : row[col.key] !== undefined && row[col.key] !== ''
                            ? String(row[col.key])
                            : <span className="text-brand-grey-300 dark:text-slate-600">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="px-5 py-3 border-t border-brand-grey-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs text-brand-grey-500 dark:text-slate-400">
                Showing {showAll ? sorted.length : INITIAL_ROWS} of {sorted.length} rows
              </p>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark transition-colors"
              >
                {showAll ? 'Show fewer' : `Show all ${sorted.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
