import type { Metadata } from "next";

import { EventNotice } from "@/components/events/EventDetails";
import { findByUnsubscribeToken } from "@/lib/email/unsubscribe";
import { UNSUBSCRIBE_COPY } from "@/lib/events/copy";

import { unsubscribe } from "./actions";

// The footer link in bulk emails. GET only shows a confirm button, because
// mail scanners open links; the button's server action does the unsubscribe.
// Referrer-Policy and X-Robots-Tag headers are set in next.config.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe · SOLUTIQ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ u?: string | string[] }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { u } = await searchParams;
  const token = typeof u === "string" ? u : undefined;
  const person = await findByUnsubscribeToken(token);

  let panel;
  if (!person || !token) {
    panel = <EventNotice title={UNSUBSCRIBE_COPY.invalid}>{UNSUBSCRIBE_COPY.invalidDetail}</EventNotice>;
  } else if (person.marketingOptOut) {
    panel = <EventNotice title={UNSUBSCRIBE_COPY.done}>{UNSUBSCRIBE_COPY.doneDetail}</EventNotice>;
  } else {
    panel = (
      <EventNotice title={UNSUBSCRIBE_COPY.confirm}>
        <p>{UNSUBSCRIBE_COPY.confirmDetail}</p>
        <form action={unsubscribe} className="mt-8">
          <input type="hidden" name="u" value={token} />
          <button
            type="submit"
            className="rounded-[4px] border border-[#F9B630] bg-transparent px-7 py-[14px] font-[family-name:var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.08em] text-[#F9B630] transition-colors duration-150 hover:bg-[rgba(249,182,48,0.1)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(249,182,48,0.3)]"
          >
            {UNSUBSCRIBE_COPY.button}
          </button>
        </form>
      </EventNotice>
    );
  }

  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-20 pt-14 sm:px-12 sm:pb-[112px] sm:pt-20">{panel}</section>
  );
}
