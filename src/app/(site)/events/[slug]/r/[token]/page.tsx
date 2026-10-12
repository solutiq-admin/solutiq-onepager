import config from "@payload-config";
import type { Metadata } from "next";
import { getPayload } from "payload";

import { EventDetails, EventNotice } from "@/components/events/EventDetails";
import { type GuestDefaults, RegistrationForm } from "@/components/events/RegistrationForm";
import type { Question } from "@/fields/questions";
import { EVENT_COPY } from "@/lib/events/copy";
import { getPublicEvent, registrationState } from "@/lib/events/event";
import { getFormOptions } from "@/lib/events/form-options";
import type { Person } from "@/payload-types";

// Personal link. Rendered per request and never indexed. Referrer-Policy and
// X-Robots-Tag headers for this path are set in next.config.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event registration · SOLUTIQ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ slug: string; token: string }> };

export default async function PersonalEventPage({ params }: Props) {
  const { slug, token } = await params;
  const event = await getPublicEvent(slug);

  const payload = await getPayload({ config });
  const entry = event
    ? (
        await payload.find({
          collection: "guestlist",
          where: { token: { equals: token }, event: { equals: event.id } },
          limit: 1,
          depth: 1,
          populate: {
            people: {
              fullName: true,
              email: true,
              salutationOption: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              organisation: true,
              industryOption: true,
            },
          },
          select: { person: true, status: true },
        })
      ).docs[0]
    : undefined;
  const person = entry && typeof entry.person === "object" ? entry.person : null;

  // Unknown token, wrong event, draft event or a cancelled entry all look
  // the same, and reveal nothing about the event.
  if (!event || !entry || !person || entry.status === "cancelled") {
    return (
      <section className="mx-auto max-w-[1280px] px-6 pb-20 pt-14 sm:px-12 sm:pb-[112px] sm:pt-20">
        <EventNotice title={EVENT_COPY.invalidLink} />
      </section>
    );
  }

  const state = registrationState(event);

  let panel;
  if (entry.status === "registered") panel = <EventNotice title={EVENT_COPY.registered} />;
  else if (state === "cancelled") panel = <EventNotice title={EVENT_COPY.cancelled} />;
  else if (state === "closed") panel = <EventNotice title={EVENT_COPY.closed} />;
  else
    panel = (
      <RegistrationForm
        slug={event.slug}
        token={token}
        guest={guestDefaults(person)}
        questions={(event.extraFields ?? []) as Question[]}
        options={await getFormOptions()}
        askPhotoConsent={Boolean(event.askPhotoConsent)}
      />
    );

  return <EventDetails event={event}>{panel}</EventDetails>;
}

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === "object" && value !== null ? value.id : value;

// Prefill from People. Guests invited before first and last name existed
// only have fullName: split it at the first space for them to correct.
function guestDefaults(person: Person): GuestDefaults {
  const [first, ...rest] = person.fullName.trim().split(/\s+/);
  return {
    email: person.email,
    salutation: idOf(person.salutationOption),
    firstName: person.firstName || first,
    lastName: person.lastName || rest.join(" "),
    jobTitle: person.jobTitle,
    organisation: person.organisation,
    industry: idOf(person.industryOption),
  };
}
