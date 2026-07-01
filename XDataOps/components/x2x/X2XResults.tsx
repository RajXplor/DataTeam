'use client';

import {
  CheckCircle2, Download, Users, UserCheck, Scissors,
  UserPlus, AlertCircle, ShieldAlert, ListChecks, Hash, User,
  Trash2, Edit3, AlertTriangle,
} from 'lucide-react';
import { downloadBase64File, MIME_CSV } from '@/lib/client-utils';
import DataTable from '@/components/DataTable';
import type { X2XResult } from '@/lib/x2x-logic';

export default function X2XResults({ result }: { result: X2XResult }) {
  const { summary, ecDupFull, ecDupPartial, parent1Log, missingGender } = result;

  const stats = [
    { label: 'Children processed',   value: summary.childrenProcessed,  icon: Users,       tone: 'neutral' },
    { label: 'Unique EC persons',     value: summary.uniqueECPersons,    icon: UserCheck,   tone: 'neutral' },
    { label: 'Children with EC',      value: summary.childrenWithEC,     icon: CheckCircle2,tone: 'good'    },
    { label: 'EC profiles deleted',   value: summary.ecProfilesDeleted,  icon: Trash2,      tone: summary.ecProfilesDeleted  > 0 ? 'warn' : 'neutral' },
    { label: 'EC fields cleared',     value: summary.ecFieldsCleared,    icon: Edit3,       tone: summary.ecFieldsCleared    > 0 ? 'warn' : 'neutral' },
    { label: 'Parent 1 auto-created', value: summary.parent1AutoCreated, icon: UserPlus,    tone: summary.parent1AutoCreated > 0 ? 'alert': 'good'    },
    { label: 'Missing gender',        value: summary.missingGenderCount, icon: AlertCircle, tone: summary.missingGenderCount > 0 ? 'alert': 'good'    },
  ];

  const toneClass: Record<string, string> = {
    neutral: 'text-brand-charcoal dark:text-slate-200',
    good:    'text-brand-teal-dark dark:text-brand-teal',
    warn:    'text-amber-600 dark:text-amber-400',
    alert:   'text-brand-pink',
  };

  return (
    <div className="space-y-4 fade-in-up">
      {/* Download banner */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-teal/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">Import file ready</p>
            <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5 font-mono">{result.filename}</p>
          </div>
        </div>
        <button onClick={() => downloadBase64File(result.csvBase64, result.filename, MIME_CSV)} className="btn-primary">
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>

      {/* Stats grid */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">Summary</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-brand-grey-100 dark:divide-slate-700">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="px-4 py-3.5">
                <Icon className={`w-3.5 h-3.5 mb-2 ${toneClass[s.tone]}`} strokeWidth={2} />
                <p className={`text-xl font-bold tabular-nums ${toneClass[s.tone]}`}>{s.value}</p>
                <p className="text-[10px] text-brand-grey-500 dark:text-slate-400 mt-0.5 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parent 1 auto-created — DataTable */}
      {parent1Log.length > 0 && (
        <div className="fade-in-up">
          <div className="mb-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 px-4 py-2.5 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <p className="text-xs text-orange-800 dark:text-orange-300">
              These children had no Parent 1. A placeholder was created with first name{' '}
              <strong>Parent First</strong>, the child&apos;s last name, gender{' '}
              <strong>Female</strong>, and an auto-generated Legacy ID. Review before importing.
            </p>
          </div>
          <DataTable
            title="Parent 1 auto-created"
            subtitle="Review each record before import"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            badge="created"
            columns={[
              { key: 'childName',   header: 'Child',          icon: <User className="w-3 h-3" /> },
              { key: 'childLegacy', header: 'Child Legacy ID', mono: true },
              { key: 'parentName',  header: 'Auto Parent 1 Name' },
              { key: 'autoId',      header: 'Auto Legacy ID',  mono: true },
            ]}
            rows={parent1Log.map((p) => ({ ...p }))}
          />
        </div>
      )}

      {/* EC Duplicates — deleted profiles DataTable */}
      {ecDupFull.length > 0 && (
        <DataTable
          title="EC profiles deleted — exact name duplicate"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          badge="deleted"
          columns={[
            { key: 'child',    header: 'Child',         icon: <User className="w-3 h-3" /> },
            { key: 'slot',     header: 'Deleted Slot'                                       },
            { key: 'ecJName',  header: 'Deleted Profile'                                    },
            { key: 'keeper',   header: 'Kept As'                                            },
          ]}
          rows={ecDupFull.map((d) => ({
            child:   d.child,
            slot:    `EC${d.j}`,
            ecJName: d.ecJName,
            keeper:  `EC${d.i} — ${d.ecIName}`,
          }))}
        />
      )}

      {/* EC Duplicates — fields cleared DataTable */}
      {ecDupPartial.length > 0 && (
        <DataTable
          title="EC fields cleared — shared phone or email"
          icon={<Edit3 className="w-3.5 h-3.5" />}
          badge="cleared"
          columns={[
            { key: 'child',   header: 'Child',         icon: <User className="w-3 h-3" /> },
            { key: 'profile', header: 'Profile'                                             },
            { key: 'field',   header: 'Field Cleared'                                       },
            { key: 'value',   header: 'Value Removed',  mono: true                          },
            { key: 'reason',  header: 'Reason'                                              },
          ]}
          rows={ecDupPartial.map((d) => ({
            child:   d.child,
            profile: `EC${d.j} — ${d.ecJName}`,
            field:   d.field,
            value:   d.value,
            reason:  `matched EC${d.i} (${d.ecIName})`,
          }))}
        />
      )}

      {/* Missing gender DataTable */}
      {missingGender.length > 0 && (
        <div className="fade-in-up">
          <div className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Open <strong className="font-mono">{result.filename}</strong> and type{' '}
              <strong>Male</strong> or <strong>Female</strong> in column G for each row below.
            </p>
          </div>
          <DataTable
            title="Missing gender — manual update required"
            icon={<AlertCircle className="w-3.5 h-3.5" />}
            badge="missing"
            columns={[
              { key: 'cell', header: 'Cell',       mono: true, icon: <Hash className="w-3 h-3" /> },
              { key: 'name', header: 'Child Name', icon: <User className="w-3 h-3" />             },
            ]}
            rows={missingGender.map((m) => ({ cell: `G${m.row}`, name: m.name }))}
          />
        </div>
      )}

      {/* All clean */}
      {ecDupFull.length === 0 && ecDupPartial.length === 0 && parent1Log.length === 0 && missingGender.length === 0 && (
        <div className="card p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-brand-teal-dark" />
          <p className="text-sm text-brand-grey-500 dark:text-slate-400">No duplicates, missing parents, or missing gender fields — clean run.</p>
        </div>
      )}

      {/* Next steps */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-purple" />
          <p className="section-label">Next steps</p>
        </div>
        <div className="px-5 py-4">
          <ol className="space-y-2 text-xs text-brand-charcoal dark:text-slate-200">
            <li className="flex gap-2"><span className="text-brand-grey-300 dark:text-slate-600">1.</span> Review any auto-created Parent 1 records above.</li>
            <li className="flex gap-2"><span className="text-brand-grey-300 dark:text-slate-600">2.</span> Fill in blank Gender cells (column G) identified above.</li>
            <li className="flex gap-2"><span className="text-brand-grey-300 dark:text-slate-600">3.</span> Verify phone numbers and postcodes before importing.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
