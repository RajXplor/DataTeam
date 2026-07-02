import Link from 'next/link';
import { ArrowLeftRight, Wallet, ArrowUpRight, ShieldCheck, KeyRound } from 'lucide-react';

const WORKSPACES = [
  {
    href:        '/x2x',
    icon:        ArrowLeftRight,
    emoji:       '🔄',
    label:       'X>X Migration',
    badge:       'Import Builder',
    badgeColor:  'bg-brand-purple-muted dark:bg-brand-purple/20 text-brand-purple',
    accentColor: 'group-hover:border-brand-purple/30 dark:group-hover:border-brand-purple/40',
    desc:        'Build a Parent/Child import file from a Children Data Master and Emergency Contact export — AU phone, postcode & Medicare cleaning included, with EC deduplication and Parent 1 auto-backfill.',
  },
  {
    href:        '/xx-token',
    icon:        KeyRound,
    emoji:       '🔑',
    label:       'X>X Token Import',
    badge:       'Token Matcher',
    badgeColor:  'bg-brand-lime/15 text-brand-lime dark:bg-brand-lime/10',
    accentColor: 'group-hover:border-brand-lime/30 dark:group-hover:border-brand-lime/20',
    desc:        'Match parent legacy IDs to their DS tokens — auto-detects parent columns by fuzzy name matching, deduplicates output, and exports a clean import CSV in one click.',
  },
  {
    href:        '/parent-tokens',
    icon:        Wallet,
    emoji:       '💳',
    label:       'QK > X ParentTokens',
    badge:       'Two-step Workflow',
    badgeColor:  'bg-brand-teal/10 text-brand-teal-dark dark:text-brand-teal',
    accentColor: 'group-hover:border-brand-teal/30 dark:group-hover:border-brand-teal/20',
    desc:        'Match payment plan rows against DS tokens and the guardian list, surface duplicate gateways, and generate a styled no-banking-details report. Strict two-step workflow enforced.',
  },
];

const STEPS = [
  {
    emoji: '📁',
    title: 'Upload your exports',
    text:  'Drop in any CSV or Excel file. Every header is validated before a single row is touched — wrong file caught instantly.',
  },
  {
    emoji: '⚙️',
    title: 'Process with precision',
    text:  'The same field-tested algorithms from your Python scripts run server-side — Australian dates, phones, postcodes, and all.',
  },
  {
    emoji: '📥',
    title: 'Download & audit',
    text:  'Get your production-ready import file plus a color-coded table of every record modified, matched, or flagged.',
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 flex flex-col min-h-screen">
      <div className="flex-1">

        {/* Hero */}
        <div className="mb-12 max-w-3xl">
          <p className="section-label mb-3">🚀 Xplor Data Ops · Data Operations Suite</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-charcoal dark:text-slate-100 leading-[1.1]">
            Where data runs itself —{' '}
            <span className="text-brand-purple">and you stay in control.</span> 🎯
          </h1>
          <div className="mt-5 space-y-3 text-base text-brand-grey-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            <p>
              XplorDataOps turns complex childcare data operations into a modern, intelligent, fully
              auditable web pipeline. Built on the exact logic of your existing Python workflows, it
              removes the terminal, removes the friction, and replaces it with a clean operational
              layer where every transformation is <strong className="text-brand-charcoal dark:text-slate-200">visible</strong>,{' '}
              <strong className="text-brand-charcoal dark:text-slate-200">validated</strong>, and{' '}
              <strong className="text-brand-charcoal dark:text-slate-200">in control</strong>.
            </p>
            <p className="text-brand-grey-500 dark:text-slate-400">
              No scattered scripts. No manual execution. No guesswork.
            </p>
            <p>
              Just structured data flow — engineered for speed, transparency, and trust — so your
              workflows don&apos;t just run… <span className="text-brand-purple font-semibold">they scale. 📈</span>
            </p>
          </div>
        </div>

        {/* Workspace cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-12">
          {WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.href}
                href={ws.href}
                className={`group card p-6 hover:shadow-lg transition-all duration-200 flex flex-col ${ws.accentColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-light-grey2 dark:bg-slate-700 flex items-center justify-center text-2xl">
                    {ws.emoji}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-brand-grey-300 dark:text-slate-600 group-hover:text-brand-purple group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h2 className="text-base font-bold text-brand-charcoal dark:text-slate-100">{ws.label}</h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ws.badgeColor}`}>
                    {ws.badge}
                  </span>
                </div>
                <p className="text-sm text-brand-grey-500 dark:text-slate-400 leading-relaxed flex-1">
                  {ws.desc}
                </p>
                <div className="mt-4 pt-3 border-t border-brand-grey-100 dark:border-slate-700 flex items-center gap-1.5 text-sm font-semibold text-brand-purple">
                  Open workspace <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* How it works */}
        <div className="mb-10">
          <p className="section-label mb-4">⚡ How it works</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <div key={step.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-light-grey2 dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-slate-700/40 flex items-center justify-center shrink-0 text-xl">
                  {step.emoji}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-charcoal dark:text-slate-200">{step.title}</p>
                  <p className="text-xs text-brand-grey-500 dark:text-slate-400 mt-1 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-brand-grey-300 dark:text-slate-600">
          <ShieldCheck className="w-4 h-4" />
          🔒 All processing runs in-memory on the server. No files are stored, logged, or retained between requests.
        </div>
      </div>

      {/* Developer credit — home page only */}
      <footer className="mt-16 pt-6 border-t border-brand-grey-100 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-600 text-center tracking-wide">
          Developed by <span className="font-medium text-slate-500 dark:text-slate-500">7goneinsane</span>
        </p>
      </footer>
    </div>
  );
}
