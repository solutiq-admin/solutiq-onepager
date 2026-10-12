import config from "@payload-config";
import { getPayload } from "payload";

import { formatEventWhen } from "@/lib/events/event";
import type { Delivery } from "@/payload-types";

import { buildIcs } from "./ics";
import { addressOf, sendEmail } from "./send";
import { renderConfirmation } from "./templates";

// The automatic confirmation, with calendar invite, for one Guestlist entry.
// Runs inside after() once registerForEvent has responded. Sent at most once
// per person per event: the Delivery's unique dedupeKey is claimed before
// sending, so a repeat registration or a race finds it taken and stops.

export async function sendConfirmation(guestlistEntryId: number): Promise<void> {
  const payload = await getPayload({ config });

  try {
    const entry = await payload.findByID({ collection: "guestlist", id: guestlistEntryId, depth: 0 });
    if (entry.status !== "registered") return;

    const eventId = typeof entry.event === "object" ? entry.event.id : entry.event;
    const personId = typeof entry.person === "object" ? entry.person.id : entry.person;
    const [event, person] = await Promise.all([
      payload.findByID({ collection: "events", id: eventId, depth: 0 }),
      payload.findByID({ collection: "people", id: personId, depth: 0 }),
    ]);

    const from = process.env.EVENTS_FROM_ADDRESS;
    const suppressedError = person.emailSuppressed
      ? `Not sent: address suppressed (${person.suppressedReason ?? "unknown"})`
      : undefined;
    const configError = from ? undefined : "Not sent: EVENTS_FROM_ADDRESS is not set";

    const dedupeKey = `confirmation:${entry.id}`;
    let delivery: Delivery;
    try {
      delivery = await payload.create({
        collection: "deliveries",
        data: {
          event: event.id,
          guestlistEntry: entry.id,
          toEmail: person.email,
          kind: "confirmation",
          status: suppressedError ? "suppressed" : configError ? "failed" : "queued",
          error: suppressedError ?? configError,
          statusUpdatedAt: new Date().toISOString(),
          dedupeKey,
        },
      });
    } catch (error) {
      const { totalDocs } = await payload.count({
        collection: "deliveries",
        where: { dedupeKey: { equals: dedupeKey } },
      });
      if (totalDocs > 0) return; // already confirmed (or being confirmed)
      throw error;
    }

    if (!from || suppressedError) {
      if (configError) payload.logger.error({ msg: `Confirmation ${delivery.id}: ${configError}` });
      await recordOnEntry(entry.id, delivery.status);
      return;
    }

    const siteUrl = (process.env.SITE_URL || "https://solutiq.africa").replace(/\/+$/, "");
    const eventUrl = `${siteUrl}/events/${event.slug}`;
    const when = formatEventWhen(event);
    const where = [event.venueName, event.venueAddress?.replace(/\s*\n\s*/g, ", ")].filter(Boolean).join(", ");
    const organiser = event.replyToEmail || addressOf(from);

    const email = renderConfirmation({
      firstName: person.fullName.trim().split(/\s+/)[0] ?? "",
      title: event.title,
      when,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      mapUrl: event.mapUrl,
      eventUrl,
      note: event.confirmationNote,
    });

    const ics = buildIcs({
      method: "REQUEST",
      eventId: event.id,
      sequence: event.calendarSequence ?? 0,
      start: event.startsAt,
      end: event.endsAt,
      summary: event.title,
      location: where,
      description: `${when}\n${where}\n\nEvent details: ${eventUrl}`,
      url: eventUrl,
      organizer: { email: organiser, name: "SOLUTIQ" },
      attendee: { email: person.email, name: person.fullName },
    });

    const result = await sendEmail({
      from,
      to: person.email,
      replyTo: event.replyToEmail || undefined,
      ...email,
      ics: { content: ics, method: "REQUEST" },
      idempotencyKey: dedupeKey.replace(":", "-"),
    });

    const now = new Date().toISOString();
    const status = result.ok ? "sent" : "failed";
    await payload.update({
      collection: "deliveries",
      id: delivery.id,
      data: result.ok
        ? { status, providerMessageId: result.id, sentAt: now, statusUpdatedAt: now }
        : { status, error: result.error, statusUpdatedAt: now },
    });
    if (!result.ok) payload.logger.error({ msg: `Confirmation ${delivery.id} failed: ${result.error}` });
    await recordOnEntry(entry.id, status);
  } catch (error) {
    payload.logger.error({ err: error, msg: `Confirmation for guestlist entry ${guestlistEntryId} failed` });
  }

  // The confirmation carries the invite, so both summary columns move together.
  async function recordOnEntry(entryId: number, status: Delivery["status"]) {
    await payload.update({
      collection: "guestlist",
      id: entryId,
      data: { lastEmailStatus: status, lastInviteStatus: status, lastEmailAt: new Date().toISOString() },
    });
  }
}
