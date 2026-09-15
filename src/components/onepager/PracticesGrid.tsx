import { practices } from "@/lib/practices";

export default function PracticesGrid() {
  return (
    <section id="practices" className="bg-[#161B35] px-6 py-24 text-white sm:px-12">
      <div className="mx-auto max-w-[1184px]">
        <div className="mb-10 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[rgba(249,182,48,0.75)]">
          What We Do
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {practices.map((practice, index) => (
            <article
              key={practice.title}
              className="flex flex-col rounded-[8px] border-t-2 border-[#F9B630] bg-[#211F27] px-7 py-8 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[4px]"
            >
              <div className="mb-5 font-[family-name:var(--font-heading)] text-[13px] font-bold tracking-[0.06em] text-[rgba(249,182,48,0.4)]">
                {String(index + 1).padStart(2, "0")}
              </div>

              <h3 className="mb-3 font-[family-name:var(--font-heading)] text-[20px] font-bold leading-[1.3] text-white">
                {practice.title}
              </h3>

              <p className="mb-6 flex-1 text-[15px] leading-[1.65] text-[#B3AFAE]">
                {practice.promise}
              </p>

              {/* <span aria-hidden="true" className="font-[family-name:var(--font-heading)] text-[13px] font-bold tracking-[0.02em] text-[#F9B630]">
                →
              </span> */}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
