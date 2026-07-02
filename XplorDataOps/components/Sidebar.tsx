'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Wallet, Sun, Moon, KeyRound } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAV_GROUPS = [
  {
    label: '⚡X>X Migration',
    items: [
      {
        href: '/x2x',
        label: '👪 Parent & Child Data',
        description: 'All Contacts Data',
        icon: ArrowLeftRight,
      },
      {
        href: '/xx-token',
        label: '💸 X>X Token Import',
        description: 'Payment Details Migration',
        icon: KeyRound,
      },
    ],
  },
  {
    label: '🚀 QK Migration',
    items: [
      {
        href: '/parent-tokens',
        label: '💳 QK>X ParentTokens',
        description: 'Payment Details & Banking Report',
        icon: Wallet,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname       = usePathname();
  const { isDark, toggle } = useTheme();

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 flex flex-col
                      bg-white border-r border-brand-grey-100
                      dark:bg-slate-950 dark:border-slate-800">

      {/* Logo — clicking returns to home */}
      <Link
        href="/"
        className="px-5 py-5 flex items-center gap-3 group hover:opacity-80 transition-opacity duration-150"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-900/10 dark:bg-slate-950/65 flex items-center justify-center overflow-hidden">
          <Image
            src="/Xplor_Icon_White.png"
            alt="Xplor logo"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <div>
          <p className="text-base font-bold text-brand-charcoal dark:text-slate-100 tracking-tight leading-none">
            XplorDataOps
          </p>
          <p className="text-xs text-brand-grey-500 dark:text-slate-500 mt-1.5">
            Data Operations Suite
          </p>
        </div>
      </Link>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="section-label px-3 pb-2">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group relative flex items-center gap-3 rounded-xl px-3 py-2.5
                      transition-all duration-150
                      ${isActive
                        ? 'bg-brand-purple-muted text-brand-purple dark:bg-brand-purple/20'
                        : 'text-brand-grey-500 hover:bg-brand-light-grey2 hover:text-brand-charcoal dark:hover:bg-slate-800 dark:hover:text-slate-100'}
                    `}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-purple" />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-150
                        ${isActive
                          ? 'text-brand-purple'
                          : 'text-brand-grey-300 group-hover:text-brand-grey-500 dark:text-slate-600 dark:group-hover:text-slate-300'}`}
                      strokeWidth={2}
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight
                        ${isActive ? 'text-brand-purple' : 'text-brand-charcoal dark:text-slate-200'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-brand-grey-500 dark:text-slate-500 truncate leading-tight mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: theme toggle */}
      <div className="px-5 py-5 border-t border-brand-grey-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-grey-500 dark:text-slate-500 font-medium">
            {isDark ? '🌙 Dark mode' : '☀️ Light mode'}
          </span>
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-brand-purple/40
              ${isDark ? 'bg-brand-purple' : 'bg-brand-grey-100'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                flex items-center justify-center transition-transform duration-200
                ${isDark ? 'translate-x-6' : 'translate-x-0'}`}
            >
              {isDark
                ? <Moon className="w-3 h-3 text-brand-purple" />
                : <Sun className="w-3 h-3 text-amber-500" />}
            </span>
          </button>
        </div>
        <p className="text-xs text-brand-grey-300 dark:text-slate-600 leading-relaxed">
          🔒 In-memory only — no files stored.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          Developed by <span className="font-medium">7goneinsane</span>
        </p>
      </div>
    </aside>
  );
}
