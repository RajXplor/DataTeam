'use client';

import {
  CheckCircle2, Download, Coins, Copy, XCircle, UserX, Users2,
  ListChecks, Hash, User, AlertTriangle,
} from 'lucide-react';
import { downloadBase64File, MIME_CSV, MIME_XLSX } from '@/lib/client-utils';
import DataTable from '@/components/DataTable';
import type { PTResult } from '@/lib/parent-tokens-logic';

// Phase 1 data shape (no banking fields)
type Phase1Data = Omit<PTResult, 'noBankingBase64' | 'noBankingFilename'>;

export default function ParentTokensResults({ result }: { result: Phase1Data }) {
  const { summary, issues } = result;

  const stats = [
    { label: 'Valid tokens',       value: summary.validTokens,    tone: 'good',    icon: CheckCircle2 },
    { label: 'Dup gateways',       value: summary.dupGatewayRows, tone: summary.dupGatewayRows > 0 ? 'warn'  : 'neutral', icon: Copy     },
    { label: 'Gateway not in DS',  value: summary.issNoGw,        tone: summary.issNoGw        > 0 ? 'alert' : 'neutral', icon: XCircle  },
    { label: 'Parent not in GFL',  value: summary.issNoParent,    tone: summary.issNoParent    > 0 ? 'alert' : 'neutral', icon: UserX    },
    { label: 'Child mismatches',   value: summary.issChildDiff,   tone: summary.issChildDiff   > 0 ? 'alert' : 'neutral', icon: Users2   },
  ];

  const toneClass: Record<string, string> = {
    neutral: 'text-brand-charcoal dark:text-slate-200',
    good:    'text-brand-teal-dark dark:text-brand-teal',
    warn:    'text-amber-600 dark:text-amber-400',
    alert:   'text-brand-pink',
  };

  const hasFiles = result.tokenCsvBase64 || result.dupReviewBase64;

  return (
    <div className="space-y-4 fade-in-up">
      {/* Service + downloads */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-brand-teal-dark dark:text-brand-teal" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-charcoal dark:text-slate-100">{result.serviceName}</p>
            <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-0.5">Phase 1 complete</p>
          </div>
        </div>

        {hasFiles && (
          <div className="flex flex-wrap gap-2.5">
            {result.tokenCsvBase64 && result.tokenCsvFilename && (
              <button
                onClick={() => downloadBase64File(result.tokenCsvBase64!, result.tokenCsvFilename!, MIME_CSV)}
                className="btn-download"
              >
                <Download className="w-3.5 h-3.5" /> {result.tokenCsvFilename}
              </button>
            )}
            {result.dupReviewBase64 && result.dupReviewFilename && (
              <button
                onClick={() => downloadBase64File(result.dupReviewBase64!, result.dupReviewFilename!, MIME_XLSX)}
                className="btn-download"
              >
                <Download className="w-3.5 h-3.5" /> {result.dupReviewFilename}
              </button>
            )}
          </div>
        )}

        {!hasFiles && (
          <div className="flex items-center gap-2 mt-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            No output files generated — no payment plan rows matched cleanly. Review issues below.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" />
          <p className="section-label">Summary</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-brand-grey-100 dark:divide-slate-700">
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

      {/* Gateway not found */}
      {issues.noGw.length > 0 && (
        <DataTable
          title="Gateway references not found in DS Tokens"
          icon={<XCircle className="w-3.5 h-3.5" />}
          badge="error"
          columns={[
            { key: 'ppRow',          header: 'PP Row',      mono: true, icon: <Hash className="w-3 h-3" /> },
            { key: 'parentFullName', header: 'Parent',      icon: <User className="w-3 h-3" /> },
            { key: 'childName',      header: 'Child'        },
            { key: 'gatewayRef',     header: 'Gateway Ref', mono: true  },
          ]}
          rows={issues.noGw.map((x) => ({
            ppRow:          x.ppRow,
            parentFullName: x.parentFullName,
            childName:      x.childName,
            gatewayRef:     x.gatewayRef,
          }))}
        />
      )}

      {/* Parent not in GFL */}
      {issues.noParent.length > 0 && (
        <DataTable
          title="Parents / children not found in Guardian Financial List"
          icon={<UserX className="w-3.5 h-3.5" />}
          badge="error"
          columns={[
            { key: 'ppRow',          header: 'PP Row',  mono: true, icon: <Hash className="w-3 h-3" /> },
            { key: 'parentFullName', header: 'Parent',  icon: <User className="w-3 h-3" /> },
            { key: 'childName',      header: 'Child'    },
            { key: 'gatewayRef',     header: 'Gateway', mono: true  },
            { key: 'issue',          header: 'Detail'               },
          ]}
          rows={issues.noParent.map((x) => ({
            ppRow:          x.ppRow,
            parentFullName: x.parentFullName,
            childName:      x.childName,
            gatewayRef:     x.gatewayRef,
            issue:          x.issue,
          }))}
        />
      )}

      {/* Child mismatches */}
      {issues.childDiff.length > 0 && (
        <DataTable
          title="Child name mismatches — parent found but child differs"
          icon={<Users2 className="w-3.5 h-3.5" />}
          badge="mismatch"
          columns={[
            { key: 'ppRow',          header: 'PP Row',       mono: true, icon: <Hash className="w-3 h-3" /> },
            { key: 'parentFullName', header: 'Parent',       icon: <User className="w-3 h-3" /> },
            { key: 'childInPP',      header: 'PP Child'      },
            { key: 'gflChildren',    header: 'GFL Children'  },
            { key: 'gflParentId',    header: 'GFL Parent ID', mono: true },
          ]}
          rows={issues.childDiff.map((x) => ({
            ppRow:          x.ppRow,
            parentFullName: x.parentFullName,
            childInPP:      x.childInPP,
            gflChildren:    x.gflChildren,
            gflParentId:    x.gflParentId,
          }))}
        />
      )}

      {/* All clean */}
      {issues.noGw.length === 0 && issues.noParent.length === 0 && issues.childDiff.length === 0 && summary.validTokens > 0 && (
        <div className="card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-brand-teal-dark" />
          <p className="text-sm text-brand-grey-500 dark:text-slate-400">
            All payment plan rows matched successfully — {summary.validTokens} valid token{summary.validTokens === 1 ? '' : 's'}.
          </p>
        </div>
      )}
    </div>
  );
}
