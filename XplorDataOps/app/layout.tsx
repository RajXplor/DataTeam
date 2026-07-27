import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Sidebar from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'XplorDataOps',
  description: 'XplorDataOps — Childcare data operations suite.',
  icons: {
    icon: '/Xplor_Icon_White.png',
    apple: '/Xplor_Icon_White.png',
  },
};

// Anti-flash script: runs synchronously before React hydrates.
// Reads localStorage to apply the correct dark/light class before first paint.
const themeScript = `
(function(){
  var k='xdataops-theme';
  var t=localStorage.getItem(k);
  if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.classList.add('dark');}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning on <html> prevents React from warning
            about the class mismatch introduced by the anti-flash script. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="dark:bg-slate-900" suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}
