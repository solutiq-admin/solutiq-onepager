import Link from "next/link";
import type { ReactNode } from "react";

// Minimal frame for the public event pages (and /unsubscribe). The one-pager's Nav and Footer
// link to same-page anchors, so they don't fit here.
export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <header className="border-b border-white/[0.08] bg-[#000000]">
        <div className="mx-auto flex max-w-[1184px] items-center px-6 py-[18px] sm:px-12 sm:py-5">
          <Link href="/" className="flex items-center gap-[10px]">
            <img src="/assets/solutiq-logo-white.svg" alt="SOLUTIQ" className="block h-6" />
            <span className="font-[family-name:var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.2em] text-white">
              SOLUTIQ
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/[0.08] bg-[#161B35] px-6 py-8 sm:px-12">
        <div className="mx-auto flex max-w-[1184px] flex-wrap items-center justify-between gap-4 text-[12px] text-[#B3AFAE]">
          <span className="font-[family-name:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.2em]">
            Technology · Talent · Partnership
          </span>
          <span>© 2026 SOLUTIQ TECHNOLOGIES (PTY) Ltd · solutiq.africa</span>
        </div>
      </footer>
    </div>
  );
}
