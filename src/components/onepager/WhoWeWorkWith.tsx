export default function WhoWeWorkWith() {
  return (
    <section style={{ background: "#000000" }} className="px-6 py-14 text-white sm:px-12 sm:py-[88px]">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 font-[family-name:var(--font-heading)] text-[10px] font-bold tracking-[0.25em] uppercase text-[#F9B630]">
          Who We Work With
        </div>

        <p className="who-lead m-0 max-w-[680px] text-[20px] leading-[1.7] text-[#B3AFAE]" style={{ textWrap: "pretty" } as { textWrap: string }}>
          We work with organisations past the idea stage and into the hard part — making the thing actually run: scaling businesses, NGOs and social enterprises, government and public-sector teams, creative-economy and convening organisations, and new ventures finding their footing.
        </p>
      </div>
    </section>
  );
}
