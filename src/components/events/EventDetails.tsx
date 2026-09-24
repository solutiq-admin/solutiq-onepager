import { RichText } from "@payloadcms/richtext-lexical/react";
import type { ReactNode } from "react";

import { formatEventWhen, type PublicEvent } from "@/lib/events/event";

// Event page shell shared by the shared and personal links: details on the
// left, the form or a state message on the right.
export function EventDetails({ event, children }: { event: PublicEvent; children: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-[1280px] px-6 pb-20 pt-14 sm:px-12 sm:pb-[112px] sm:pt-20 md:grid-cols-[1.1fr_1fr]">
      <div className="pb-14 md:border-r md:border-r-[rgba(249,182,48,0.3)] md:pb-0 md:pr-20">
        <div className="mb-6 font-[family-name:var(--font-heading)] text-[10px] font-bold uppercase tracking-[0.25em] text-[#F9B630]">
          Event
        </div>
        <h1 className="mb-8 font-[family-name:var(--font-heading)] text-[39px] font-bold leading-[1.1] tracking-[-0.01em] text-white sm:text-[49px]">
          {event.title}
        </h1>

        <dl className="flex flex-col gap-6">
          <div className="flex flex-col gap-[6px]">
            <dt className="font-[family-name:var(--font-heading)] text-[10px] font-bold uppercase tracking-[0.25em] text-[#B3AFAE]">
              When
            </dt>
            <dd className="text-[17px] leading-[1.6] text-white">{formatEventWhen(event)}</dd>
          </div>
          <div className="flex flex-col gap-[6px]">
            <dt className="font-[family-name:var(--font-heading)] text-[10px] font-bold uppercase tracking-[0.25em] text-[#B3AFAE]">
              Where
            </dt>
            <dd className="text-[17px] leading-[1.6] text-white">
              {event.venueName}
              {event.venueAddress && (
                <span className="block whitespace-pre-line text-[15px] text-[#B3AFAE]">{event.venueAddress}</span>
              )}
              {event.mapUrl && /^https?:\/\//.test(event.mapUrl) && (
                <a
                  href={event.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[15px] text-[#B3AFAE] underline underline-offset-4 transition-colors hover:text-white"
                >
                  Open map
                </a>
              )}
            </dd>
          </div>
        </dl>

        {event.description && (
          <div className="mt-10 max-w-[560px] text-[17px] leading-[1.75] text-[#B3AFAE] [&_a]:text-white [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-[family-name:var(--font-heading)] [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-[family-name:var(--font-heading)] [&_h3]:text-[19px] [&_h3]:font-bold [&_h3]:text-white [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_strong]:text-white [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
            <RichText data={event.description as Parameters<typeof RichText>[0]["data"]} />
          </div>
        )}
      </div>

      <div className="md:pl-20">{children}</div>
    </section>
  );
}

// A state in place of the form: closed, full, invite-only, registered.
export function EventNotice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pt-2">
      <div className="mb-6 h-[2px] w-10 bg-[#F9B630]" />
      <p className="font-[family-name:var(--font-heading)] text-[24px] font-bold leading-[1.3] text-white">{title}</p>
      {children && <div className="mt-3 max-w-[420px] text-[15px] leading-[1.7] text-[#B3AFAE]">{children}</div>}
    </div>
  );
}
