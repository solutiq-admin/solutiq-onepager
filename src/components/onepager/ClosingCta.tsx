export default function ClosingCta() {
  return (
    <section
      style={{ background: "#000000" }}
      className="border-t border-[rgba(249,182,48,0.18)] px-6 py-16 text-center text-white sm:px-12 sm:py-[88px]"
    >
      <div className="mb-7 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase leading-[1.6] text-[#F9B630]">
        Every partnership begins with one honest conversation.
      </div>

      <a
        href="#contact"
        className="inline-block whitespace-nowrap rounded-[4px] bg-[#F9B630] px-7 py-[15px] font-[family-name:var(--font-heading)] text-[14px] font-bold tracking-[0.02em] text-[#000000] transition-colors duration-150 hover:bg-[#C9920F]"
      >
        Start a conversation
      </a>
    </section>
  );
}
