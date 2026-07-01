'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Wallet, Rocket, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAV_ITEMS = [
  {
    href: '/x2x',
    label: 'X2X Migration',
    description: 'Child & contact import',
    icon: ArrowLeftRight,
  },
  {
    href: '/parent-tokens',
    label: 'Parent Tokens',
    description: 'Banking & token reports',
    icon: Wallet,
  },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { isDark, toggle } = useTheme();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col
                      bg-white border-r border-brand-grey-100
                      dark:bg-slate-950 dark:border-slate-800">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center shrink-0">
          <Rocket className="w-4 h-4 text-white" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-bold text-brand-charcoal dark:text-slate-100 tracking-tight leading-none">
            XDataOps
          </p>
          <p className="text-[10px] text-brand-grey-500 dark:text-slate-500 mt-0.5">
            Data Operations Suite
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5">
        <p className="section-label px-3 pt-2 pb-1.5">Workspaces</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-2.5 rounded-lg px-3 py-2
                transition-all duration-150
                ${isActive
                  ? 'bg-brand-purple-muted text-brand-purple dark:bg-brand-purple/20'
                  : 'text-brand-grey-500 hover:bg-brand-light-grey2 hover:text-brand-charcoal dark:hover:bg-slate-800 dark:hover:text-slate-100'}
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-brand-purple" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors duration-150
                  ${isActive
                    ? 'text-brand-purple'
                    : 'text-brand-grey-300 group-hover:text-brand-grey-500 dark:text-slate-600 dark:group-hover:text-slate-300'}`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className={`text-xs font-semibold leading-tight
                  ${isActive ? 'text-brand-purple' : 'text-brand-charcoal dark:text-slate-200'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-brand-grey-500 dark:text-slate-500 truncate leading-tight mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme toggle + note */}
      <div className="px-4 py-4 border-t border-brand-grey-100 dark:border-slate-800 space-y-3">
        {/* Theme toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-brand-grey-500 dark:text-slate-500 font-medium uppercase tracking-widest">
            Theme
          </span>
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40
              ${isDark ? 'bg-brand-purple' : 'bg-brand-grey-100 dark:bg-slate-700'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                flex items-center justify-center transition-transform duration-200
                ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
            >
              {isDark
                ? <Moon className="w-2.5 h-2.5 text-brand-purple" />
                : <Sun className="w-2.5 h-2.5 text-amber-500" />}
            </span>
          </button>
        </div>
        <p className="text-[10px] text-brand-grey-300 dark:text-slate-600 leading-relaxed">
          In-memory only — no files stored.
        </p>
      </div>
    </aside>
  );
}
