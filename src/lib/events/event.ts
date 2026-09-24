import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";

import type { Event } from "@/payload-types";

// Server-side reads for the public event pages and registerForEvent.
// The Local API runs with access overridden, so this module decides what the
// public sees: only non-draft events, and only the fields below.

export type PublicEvent = Pick<
  Event,
  | "id"
  | "title"
  | "slug"
  | "status"
  | "startsAt"
  | "endsAt"
  | "venueName"
  | "venueAddress"
  | "mapUrl"
  | "description"
  | "capacity"
  | "registrationCloses"
  | "openRegistration"
  | "extraFields"
>;

// cache(): the page and its metadata share one query per request.
export const getPublicEvent = cache(async (slug: string): Promise<PublicEvent | null> => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "events",
    where: { slug: { equals: slug }, status: { not_equals: "draft" } },
    limit: 1,
    depth: 0,
    select: {
      title: true,
      slug: true,
      status: true,
      startsAt: true,
      endsAt: true,
      venueName: true,
      venueAddress: true,
      mapUrl: true,
      description: true,
      capacity: true,
      registrationCloses: true,
      openRegistration: true,
      extraFields: true,
    },
  });
  return (docs[0] as PublicEvent | undefined) ?? null;
});

export type RegistrationState = "open" | "closed" | "cancelled";

// Applies to both links. The shared link also checks openRegistration and
// capacity; see sharedLinkFull.
export function registrationState(event: PublicEvent, now = new Date()): RegistrationState {
  if (event.status === "cancelled") return "cancelled";
  if (event.status !== "open") return "closed";
  if (event.registrationCloses && new Date(event.registrationCloses) <= now) return "closed";
  if (new Date(event.endsAt) <= now) return "closed";
  return "open";
}

// Capacity counts shared-link registrations only; guestlist invitees are
// always admitted.
export async function sharedLinkFull(event: PublicEvent): Promise<boolean> {
  if (!event.capacity) return false;
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection: "guestlist",
    where: {
      event: { equals: event.id },
      source: { equals: "shared-link" },
      status: { equals: "registered" },
    },
  });
  return totalDocs >= event.capacity;
}

const TIME_ZONE = "Africa/Johannesburg";

export function formatEventWhen(event: Pick<Event, "startsAt" | "endsAt">): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const day = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const sameDay = day.format(start) === day.format(end);
  return sameDay
    ? `${day.format(start)} · ${time.format(start)}–${time.format(end)} SAST`
    : `${day.format(start)}, ${time.format(start)} – ${day.format(end)}, ${time.format(end)} SAST`;
}
