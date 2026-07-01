import Link from 'next/link';
import { ArrowLeftRight, Wallet, ArrowUpRight, Upload, Cog, Download, ShieldCheck } from 'lucide-react';

const STEPS = [
  { icon: Upload,     title: 'Upload',   text: 'Drop in your CSV or Excel exports. File headers are validated before any processing begins.' },
  { icon: Cog,        title: 'Process',  text: 'The same logic as the original scripts runs server-side, completely in memory.' },
  { icon: Download,   title: 'Download', text: 'Get your import-ready file plus a full on-screen audit of every change made.' },
];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <p className="section-label mb-2">XDataOps · Data Operations Suite</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-charcoal dark:text-slate-100 leading-tight max-w-xl">
          Two field-tested scripts. One workspace anyone can run.
        </h1>
        <p className="text-sm text-brand-grey-500 dark:text-slate-400 mt-3 max-w-lg leading-relaxed">
          Choose a workspace below. Each one replicates its source automation exactly — same column
          structures, same matching rules, same audit detail — with strict file validation and
          interactive results tables.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {[
          {
            href: '/x2x',
            icon: ArrowLeftRight,
            iconBg: 'bg-brand-purple-muted dark:bg-brand-purple/20',
            iconColor: 'text-brand-purple',
            label: 'X2X Migration',
            desc: 'Build a Parent/Child import file from a Children Data Master and Emergency Contact export — AU phone, postcode, and Medicare cleaning included, with EC deduplication and Parent 1 backfill.',
          },
          {
            href: '/parent-tokens',
            icon: Wallet,
            iconBg: 'bg-brand-teal/10',
            iconColor: 'text-brand-teal-dark dark:text-brand-teal',
            label: 'Parent Tokens & Banking',
            desc: 'Match payment plan rows against DS tokens and the guardian list, flag duplicate gateways, and optionally produce a no-banking-details report. Two-step workflow enforced.',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group card p-6 hover:shadow-lg hover:border-brand-purple/30 dark:hover:border-brand-purple/40 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${card.iconColor}`} strokeWidth={2.25} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-brand-grey-300 dark:text-slate-600 group-hover:text-brand-purple group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
              </div>
              <h2 className="text-base font-semibold text-brand-charcoal dark:text-slate-100 mb-1.5">{card.label}</h2>
              <p className="text-xs text-brand-grey-500 dark:text-slate-400 leading-relaxed flex-1">{card.desc}</p>
              <div className="mt-4 pt-3 border-t border-brand-grey-100 dark:border-slate-700 flex items-center gap-1 text-xs font-medium text-brand-purple">
                Open workspace <ArrowUpRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-light-grey2 dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-slate-700/40 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-brand-grey-500 dark:text-slate-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-charcoal dark:text-slate-200">{step.title}</p>
                <p className="text-[11px] text-brand-grey-500 dark:text-slate-400 mt-0.5 leading-relaxed">{step.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 text-[11px] text-brand-grey-300 dark:text-slate-600">
        <ShieldCheck className="w-3.5 h-3.5" />
        All processing runs in-memory on the server. No files are stored or logged.
      </div>
    </div>
  );
}
