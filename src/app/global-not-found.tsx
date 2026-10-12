import Link from "next/link";
import type { Metadata } from "next";
import "./(site)/globals.css";

// Unmatched URLs skip every layout (two root layouts), so this renders its own document.
// Header and footer mirror the minimal frame in (site)/events/layout.tsx: the one-pager's
// Nav and Footer link to same-page anchors, which don't exist here.

export const metadata: Metadata = {
  title: "Page not found | SOLUTIQ",
  description: "The page you were looking for doesn't exist on solutiq.africa.",
  icons: {
    icon: "/assets/solutiq-favicon.png",
  },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-black">
        <header className="border-b border-white/[0.08] bg-black">
          <div className="mx-auto flex max-w-[1184px] items-center px-6 py-[18px] sm:px-12 sm:py-5">
            <Link href="/" className="flex items-center gap-[10px]">
              <img src="/assets/solutiq-logo-white.svg" alt="SOLUTIQ" className="block h-6" />
              <span className="font-[family-name:var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.2em] text-white">
                SOLUTIQ
              </span>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-24 text-center sm:px-12">
          <div className="flex flex-col items-center">
            <p className="mb-8 font-[family-name:var(--font-heading)] text-[16px] font-bold uppercase tracking-[0.25em] text-gold">
              404
            </p>

            <h1 className="mb-4 font-[family-name:var(--font-heading)] text-[31px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-[39px]">
              Page not found.
            </h1>

            <p className="mb-8 max-w-[420px] text-[16px] leading-[1.7] text-silver sm:text-[18px]">
              Let&apos;s get you back to what does exist.
            </p>

            <Link
              href="/"
              className="whitespace-nowrap rounded-[4px] bg-gold px-7 py-[15px] font-[family-name:var(--font-heading)] text-[14px] font-bold tracking-[0.02em] text-black transition-colors duration-150 hover:bg-gold/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              Back to home
            </Link>
          </div>
        </main>

        <footer className="border-t border-white/[0.08] bg-navy px-6 py-8 sm:px-12">
          <div className="mx-auto flex max-w-[1184px] flex-wrap items-center justify-between gap-4 text-[12px] text-silver">
            <span className="font-[family-name:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.2em]">
              Technology · Talent · Partnership
            </span>
            <span>© 2026 SOLUTIQ TECHNOLOGIES (PTY) Ltd · solutiq.africa</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
