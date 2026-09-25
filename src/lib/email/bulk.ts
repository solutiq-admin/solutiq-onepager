import { randomBytes } from "node:crypto";

import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload, Where } from "payload";

import { formatEventWhen } from "@/lib/events/event";
import type { Delivery, Event, Guestlist, Message, Person, User } from "@/payload-types";

import { isServiceMessage, kindFor, skipReason } from "./delivery-status";
import { refreshGuestlistEntry } from "./guestlist-summary";
import { buildIcs } from "./ics";
import { sendEmail, type SendInput } from "./send";
import { fillVariables, renderMessage } from "./templates";

// Bulk messages to an event's guestlist. The server actions in
// components/admin/messageActions.ts check who is asking; this module does
// the work with the Local API (access overridden) and a little raw SQL where
// one statement has to be atomic or fast.
//
// Flow: queueMessage creates one `queued` Delivery per recipient up front.
// sendBatch then claims and sends up to BATCH_SIZE of them per call; the
// admin UI calls it repeatedly until nothing is left. Closing the tab just
// leaves rows queued for "Continue".

export const BATCH_SIZE = 10;

// Resend's default limit is 2 requests per second, shared with the confirmation
// emails and the contact form, so bulk sends stay a little under it.
const MIN_SEND_INTERVAL_MS = 600;

// A claimed row is `queued` with a fresh statusUpdatedAt. If the run that
// claimed it dies mid-send, another run may take it after this long.
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

type Recipient = { entry: Guestlist; person: Person };
type Sender = Pick<User, "name" | "email">;

const siteUrl = () => (process.env.SITE_URL || "https://solutiq.africa").replace(/\/+$/, "");

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === "object" && value !== null ? value.id : value;

// Cancelled guestlist entries never receive bulk messages.
const AUDIENCE: Record<Message["audience"], Where> = {
  "all-guestlist": { status: { in: ["invited", "registered"] } },
  "not-yet-registered": { status: { equals: "invited" } },
  registered: { status: { equals: "registered" } },
};

export const AUDIENCE_LABEL: Record<Message["audience"], string> = {
  "all-guestlist": "everyone on the guestlist",
  "not-yet-registered": "guests who have not registered yet",
  registered: "registered guests",
};

export async function loadRecipients(payload: Payload, message: Message): Promise<Recipient[]> {
  const { docs } = await payload.find({
    collection: "guestlist",
    where: { and: [{ event: { equals: idOf(message.event) } }, AUDIENCE[message.audience]] },
    depth: 1,
    pagination: false,
    sort: "id",
  });
  return docs
    .filter((entry) => typeof entry.person === "object")
    .map((entry) => ({ entry, person: entry.person as Person }));
}

// "Anesu Ketani" <anesu@solutiq.africa>. DEV_FROM_OVERRIDE (e.g.
// onboarding@resend.dev) replaces only the From header, for testing before
// solutiq.africa is verified in Resend; Reply-To and the calendar organiser
// stay the user's own address.
export function senderHeaders(sender: Sender) {
  const address = sender.email.toLowerCase().trim();
  const name = (sender.name ?? "").replace(/[\r\n"\\<>]/g, "").trim();
  const from = process.env.DEV_FROM_OVERRIDE?.trim() || (name ? `"${name}" <${address}>` : address);
  return { from, address, name };
}

// Everything one recipient's email needs. `token` is their Guestlist token;
// without one (test sends) the registration link is the shared event page.
export function composeMessageEmail(input: {
  message: Message;
  event: Event;
  sender: Sender;
  to: { fullName: string; email: string };
  token?: string | null;
  unsubscribeToken?: string | null; // only on non-service messages
  testUnsubscribe?: boolean;
}): SendInput {
  const { message, event, sender, to, token } = input;
  const base = siteUrl();
  const eventUrl = `${base}/events/${event.slug}`;
  const registrationLink = token ? `${eventUrl}/r/${token}` : eventUrl;
  const when = formatEventWhen(event);
  const where = [event.venueName, event.venueAddress?.replace(/\s*\n\s*/g, ", ")].filter(Boolean).join(", ");
  const { from, address, name } = senderHeaders(sender);

  const vars = {
    firstName: to.fullName.trim().split(/\s+/)[0] ?? "",
    eventTitle: event.title,
    eventDate: when,
    venueName: event.venueName,
    registrationLink,
  };

  const unsubscribeUrl = input.unsubscribeToken
    ? `${base}/unsubscribe?u=${encodeURIComponent(input.unsubscribeToken)}`
    : input.testUnsubscribe
      ? `${base}/unsubscribe`
      : undefined;

  const email = renderMessage({
    subject: fillVariables(message.subject, vars).replace(/[\r\n]+/g, " "),
    body: fillVariables(message.body, vars),
    title: event.title,
    siteUrl: base,
    unsubscribeUrl,
  });

  const method = message.calendar === "cancel" ? "CANCEL" : "REQUEST";
  const ics =
    message.calendar === "none"
      ? undefined
      : {
          method,
          content: buildIcs({
            method,
            eventId: event.id,
            sequence: event.calendarSequence ?? 0,
            start: event.startsAt,
            end: event.endsAt,
            summary: event.title,
            location: where,
            description: `${when}\n${where}\n\nEvent details: ${registrationLink}`,
            url: registrationLink,
            organizer: { email: address, name: name || "SOLUTIQ" },
            attendee: { email: to.email, name: to.fullName },
          }),
        } as const;

  // RFC 8058 one-click unsubscribe, backed by app/(site)/api/unsubscribe.
  const headers = input.unsubscribeToken
    ? {
        "List-Unsubscribe": `<${base}/api/unsubscribe?u=${encodeURIComponent(input.unsubscribeToken)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined;

  return { from, to: to.email, replyTo: address, ...email, ics, headers };
}

// Creates a `queued` Delivery for every recipient (or `suppressed`, with the
// reason, for anyone the rules skip). dedupeKey makes a repeat harmless: a
// double click or a retried request adds nobody twice.
export async function queueMessage(payload: Payload, message: Message, senderId: number) {
  const recipients = await loadRecipients(payload, message);
  if (recipients.length === 0) return { queued: 0, suppressed: 0 };

  const eventId = idOf(message.event);
  const kind = kindFor(message.calendar);
  const now = new Date().toISOString();
  let suppressed = 0;

  const rows = recipients.map(({ entry, person }) => {
    const reason = skipReason(person, message.calendar, entry.status);
    if (reason) suppressed++;
    return sql`(${eventId}, ${entry.id}, ${message.id}, ${person.email},
      ${kind}::"payload"."enum_deliveries_kind",
      ${reason ? "suppressed" : "queued"}::"payload"."enum_deliveries_status",
      ${reason ?? null}, ${reason ? now : null}::timestamptz,
      ${`message:${message.id}:${entry.id}`})`;
  });

  const db = (payload.db as unknown as PostgresAdapter).drizzle;
  for (let i = 0; i < rows.length; i += 500) {
    await db.execute(sql`
      INSERT INTO "payload"."deliveries"
        ("event_id", "guestlist_entry_id", "message_id", "to_email", "kind", "status", "error", "status_updated_at", "dedupe_key")
      VALUES ${sql.join(rows.slice(i, i + 500), sql`, `)}
      ON CONFLICT ("dedupe_key") DO NOTHING
    `);
  }

  await payload.update({
    collection: "messages",
    id: message.id,
    data: { status: "sending", sender: senderId },
  });

  // Suppressed rows are final, so their summary columns can show now.
  for (const { entry, person } of recipients) {
    if (skipReason(person, message.calendar, entry.status)) await refreshGuestlistEntry(payload, entry.id);
  }

  return { queued: recipients.length - suppressed, suppressed };
}

// Claims up to BATCH_SIZE rows in one atomic statement, so two windows
// sending the same message never pick the same row. Claimed rows get a fresh
// statusUpdatedAt; unclaimed queued rows have none (or a stale one).
// `retryBefore` also picks up rows that failed before that moment, so a
// retry run tries each failed row once instead of looping on it.
async function claimBatch(payload: Payload, messageId: number, retryBefore?: string): Promise<number[]> {
  const now = new Date();
  const stale = new Date(now.getTime() - CLAIM_TIMEOUT_MS).toISOString();
  const db = (payload.db as unknown as PostgresAdapter).drizzle;
  const result = await db.execute(sql`
    UPDATE "payload"."deliveries"
    SET "status" = 'queued', "error" = NULL, "status_updated_at" = ${now.toISOString()}, "updated_at" = ${now.toISOString()}
    WHERE "id" IN (
      SELECT "id" FROM "payload"."deliveries"
      WHERE "message_id" = ${messageId}
        AND (
          ("status" = 'queued' AND ("status_updated_at" IS NULL OR "status_updated_at" < ${stale}))
          OR ("status" = 'failed' AND ${retryBefore ?? null}::timestamptz IS NOT NULL
              AND "status_updated_at" < ${retryBefore ?? null}::timestamptz)
        )
      ORDER BY "id"
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `);
  return (result.rows as { id: number }[]).map((row) => row.id);
}

export type SendCounts = {
  total: number;
  queued: number;
  sent: number; // accepted by Resend, whatever the webhook says since
  failed: number;
  suppressed: number;
};

export async function messageCounts(payload: Payload, messageId: number): Promise<SendCounts> {
  const db = (payload.db as unknown as PostgresAdapter).drizzle;
  const result = await db.execute(sql`
    SELECT "status", count(*)::int AS "count" FROM "payload"."deliveries"
    WHERE "message_id" = ${messageId} GROUP BY "status"
  `);
  const counts: SendCounts = { total: 0, queued: 0, sent: 0, failed: 0, suppressed: 0 };
  for (const { status, count } of result.rows as { status: Delivery["status"]; count: number }[]) {
    counts.total += count;
    if (status === "queued" || status === "failed" || status === "suppressed") counts[status] += count;
    else counts.sent += count;
  }
  return counts;
}

// Sends one batch, then settles the Message status: `sent` once nothing is
// queued, `partial` if anything failed.
export async function sendBatch(payload: Payload, messageId: number, fallbackSender: Sender, retryBefore?: string) {
  const ids = await claimBatch(payload, messageId, retryBefore);

  if (ids.length > 0) {
    const message = await payload.findByID({ collection: "messages", id: messageId, depth: 1 });
    const event = await payload.findByID({ collection: "events", id: idOf(message.event)!, depth: 0 });
    const sender = typeof message.sender === "object" && message.sender ? message.sender : fallbackSender;

    const { docs: deliveries } = await payload.find({
      collection: "deliveries",
      where: { id: { in: ids } },
      depth: 0,
      pagination: false,
      sort: "id",
    });
    const entryIds = deliveries.map((d) => idOf(d.guestlistEntry)).filter((id): id is number => Boolean(id));
    const { docs: entries } = await payload.find({
      collection: "guestlist",
      where: { id: { in: entryIds } },
      depth: 1,
      pagination: false,
    });
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

    let lastSendAt = 0;
    for (const delivery of deliveries) {
      const entry = entriesById.get(idOf(delivery.guestlistEntry) ?? -1);
      const person = entry && typeof entry.person === "object" ? entry.person : undefined;
      const now = () => new Date().toISOString();

      if (!entry || !person) {
        await payload.update({
          collection: "deliveries",
          id: delivery.id,
          data: { status: "failed", error: "The guestlist entry no longer exists.", statusUpdatedAt: now() },
        });
        continue;
      }

      // Rules are checked again at send time: someone may have bounced or
      // unsubscribed since the message was queued.
      const reason = skipReason(person, message.calendar, entry.status);
      if (reason) {
        await payload.update({
          collection: "deliveries",
          id: delivery.id,
          data: { status: "suppressed", error: reason, statusUpdatedAt: now() },
        });
        await refreshGuestlistEntry(payload, entry.id);
        continue;
      }

      const service = isServiceMessage(message.calendar, entry.status);
      const email = composeMessageEmail({
        message,
        event,
        sender,
        to: { fullName: person.fullName, email: person.email },
        token: entry.token,
        unsubscribeToken: service ? undefined : await unsubscribeTokenFor(payload, person),
      });

      const wait = lastSendAt + MIN_SEND_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastSendAt = Date.now();

      const result = await sendEmail({ ...email, idempotencyKey: `message-delivery-${delivery.id}-${lastSendAt}` });
      const at = now();
      await payload.update({
        collection: "deliveries",
        id: delivery.id,
        data: result.ok
          ? { status: "sent", toEmail: person.email, providerMessageId: result.id, error: null, sentAt: at, statusUpdatedAt: at }
          : { status: "failed", toEmail: person.email, error: result.error, statusUpdatedAt: at },
      });
      if (!result.ok) payload.logger.error({ msg: `Message ${messageId}, delivery ${delivery.id} failed: ${result.error}` });
      await refreshGuestlistEntry(payload, entry.id);
    }
  }

  const counts = await messageCounts(payload, messageId);
  await settleStatus(payload, messageId, counts);
  return { claimed: ids.length, counts };
}

async function settleStatus(payload: Payload, messageId: number, counts: SendCounts) {
  const message = await payload.findByID({ collection: "messages", id: messageId, depth: 0 });
  if (message.status === "draft") return;
  const status: Message["status"] = counts.queued > 0 ? "sending" : counts.failed > 0 ? "partial" : "sent";
  if (status === message.status && (status === "sending" || message.sentAt)) return;
  await payload.update({
    collection: "messages",
    id: messageId,
    data: { status, ...(status !== "sending" && !message.sentAt ? { sentAt: new Date().toISOString() } : {}) },
  });
}

// Every Person gets a token on create; this covers one edited to empty.
async function unsubscribeTokenFor(payload: Payload, person: Person): Promise<string> {
  if (person.unsubscribeToken) return person.unsubscribeToken;
  const token = randomBytes(24).toString("base64url");
  await payload.update({ collection: "people", id: person.id, data: { unsubscribeToken: token } });
  return token;
}
