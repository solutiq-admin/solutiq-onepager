export default function Hero() {
  return (
    <header id="top" className="hero relative overflow-hidden">
      <div className="hero-pattern absolute inset-0 pointer-events-none" aria-hidden="true" />

      <img
        className="hero-ghost absolute pointer-events-none select-none"
        src="/assets/solutiq-logo-white.svg"
        alt=""
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pt-16 pb-[72px] sm:px-12 sm:pt-[104px] sm:pb-24">
        <div
          className="hero-eyebrow mb-6 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]"
          data-reveal=""
        >
          Technology · Talent · Partnership
        </div>

        <h1 className="hero-title m-0 mb-6 font-[family-name:var(--font-heading)] font-bold leading-[1.05] tracking-[-0.02em]">
          <span className="hero-line block text-white">Strategic builders for</span>
          <span className="hero-line block text-[#F9B630]">African organisations.</span>
        </h1>

        <p className="hero-subhead mb-10 max-w-[500px] text-[20px] leading-[1.7] text-[#B3AFAE]">
          We don&apos;t arrive with the answer. We start by understanding how your organisation actually works; then build, with you, the systems that carry what comes next.
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <a
            href="#contact"
            className="hero-primary-button whitespace-nowrap rounded-[4px] bg-[#F9B630] px-7 py-[15px] font-[family-name:var(--font-heading)] text-[14px] font-bold tracking-[0.02em] text-[#000000] transition-colors duration-150 hover:bg-[#C9920F]"
          >
            Start a conversation
          </a>

          <a
            href="#practices"
            className="hero-link border-b border-[rgba(179,175,174,0.35)] pb-[2px] font-[family-name:var(--font-heading)] text-[14px] font-bold text-[#B3AFAE] transition-colors duration-150 hover:border-[#F9B630] hover:text-[#F9B630]"
          >
            What we do →
          </a>
        </div>
      </div>
    </header>
  );
}
