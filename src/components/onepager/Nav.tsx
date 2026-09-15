"use client";

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-l-[3px] border-l-[#F9B630] border-b border-white/[0.08] bg-[rgba(0,0,0,0.85)] backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-[18px] sm:px-12 sm:py-5">
        <a href="#top" className="flex items-center gap-[10px]">
          <img src="/assets/solutiq-logo-white.svg" alt="SOLUTIQ" className="h-6 block" />
          <span className="font-[family-name:var(--font-heading)] text-[14px] font-bold tracking-[0.2em] uppercase text-white">
            SOLUTIQ
          </span>
        </a>

        <a
          href="#contact"
          className="whitespace-nowrap rounded-[4px] border border-[#F9B630] bg-transparent px-[14px] py-[10px] font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.05em] uppercase text-[#F9B630] transition-colors duration-150 hover:bg-[rgba(249,182,48,0.1)] sm:px-5 sm:text-[11px]"
        >
          Start a conversation
        </a>
      </div>
    </nav>
  );
}
