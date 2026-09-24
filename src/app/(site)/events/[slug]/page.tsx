import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventDetails, EventNotice } from "@/components/events/EventDetails";
import { RegistrationForm } from "@/components/events/RegistrationForm";
import type { Question } from "@/fields/questions";
import { EVENT_COPY } from "@/lib/events/copy";
import { getPublicEvent, registrationState, sharedLinkFull } from "@/lib/events/event";

// Shared link. Static with ISR: the Events afterChange hook revalidates this
// path on every save; the timer catches capacity filling up and
// registrationCloses passing. registerForEvent re-checks all of it anyway.
export const revalidate = 60;

// Nothing is prerendered at build (the build never needs the database);
// each event page is generated on first request, then cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublicEvent((await params).slug);
  if (!event) return {};
  return { title: `${event.title} · SOLUTIQ` };
}

export default async function EventPage({ params }: Props) {
  const event = await getPublicEvent((await params).slug);
  if (!event) notFound();

  const state = registrationState(event);

  let panel;
  if (state === "cancelled") panel = <EventNotice title={EVENT_COPY.cancelled} />;
  else if (state === "closed") panel = <EventNotice title={EVENT_COPY.closed} />;
  else if (!event.openRegistration) panel = <EventNotice title={EVENT_COPY.inviteOnly} />;
  else if (await sharedLinkFull(event)) panel = <EventNotice title={EVENT_COPY.full} />;
  else panel = <RegistrationForm slug={event.slug} questions={(event.extraFields ?? []) as Question[]} />;

  return <EventDetails event={event}>{panel}</EventDetails>;
}
