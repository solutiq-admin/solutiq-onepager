export default function Footer() {
  return (
    <footer className="border-t border-[rgba(249,182,48,0.28)] bg-[#161B35] px-6 pb-10 pt-16 text-white sm:px-12">
      <div className="mx-auto max-w-[1184px]">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-[10px]">
              <img src="/assets/solutiq-logo-white.svg" alt="SOLUTIQ" className="h-6 block" />
              <span className="font-[family-name:var(--font-heading)] text-[14px] font-bold tracking-[0.2em] uppercase text-white">
                SOLUTIQ
              </span>
            </a>
            <br />

            <div className="font-[family-name:var(--font-heading)] text-[11px] font-bold tracking-[0.2em] uppercase text-[#B3AFAE]">
              Technology · Talent · Partnership
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">
              Company
            </h4>
            <a href="#practices" className="block py-[5px] text-[14px] text-[#B3AFAE] transition-colors duration-150 hover:text-white">
              What We Do
            </a>
            <a href="#contact" className="block py-[5px] text-[14px] text-[#B3AFAE] transition-colors duration-150 hover:text-white">
              Contact
            </a>
          </div>

          <div>
            <h4 className="mb-4 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">
              Get in touch
            </h4>
            <a href="mailto:hello@solutiq.africa" className="block py-[5px] text-[14px] text-[#B3AFAE] transition-colors duration-150 hover:text-white">
              hello@solutiq.africa
            </a>
            <a href="tel:+27657143355" className="block py-[5px] text-[14px] text-[#B3AFAE] transition-colors duration-150 hover:text-white">
              +27 65 714 3355
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-white/[0.08] pt-6">
          <div className="ml-auto text-right text-[12px] text-[#B3AFAE]">
            © 2026 SOLUTIQ TECHNOLOGIES (PTY) Ltd - All Rights reserved<br />
          </div>
        </div>
      </div>
    </footer>
  );
}
