import config from "@payload-config";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import { getPayload, type Payload, type Where } from "payload";
import { Resend, type WebhookEventPayload } from "resend";

import { allowedFrom, INVITE_KINDS, isHardBounce, statusForEvent } from "@/lib/email/delivery-status";
import type { Delivery } from "@/payload-types";

// Resend delivery webhook. Verifies the signature with the SDK, moves the
// matching Delivery forward (see lib/email/delivery-status.ts), suppresses the
// Person on a complaint or hard bounce, and refreshes the Guestlist summary
// columns. Safe to receive the same event any number of times, in any order.
//
// Any non-2xx response makes Resend retry, so we return 2xx for everything we
// have handled or chosen to ignore, and 5xx only when a retry could help.

// An event can arrive before the send code has saved the provider message id
// on the Delivery. For this long after the event we ask Resend to retry
// instead of ignoring it; after that, the email was not one of ours (e.g. the
// site contact form, which shares the Resend account).
const UNMATCHED_RETRY_WINDOW_MS = 10 * 60 * 1000;

let resend: Resend | undefined;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !secret) {
    console.error("Resend webhook: RESEND_API_KEY or RESEND_WEBHOOK_SECRET is not set");
    return new Response(null, { status: 500 });
  }

  // The signature covers the exact raw body, so read it as text, unparsed.
  const body = await request.text();
  let event: WebhookEventPayload;
  try {
    resend ??= new Resend(apiKey);
    event = resend.webhooks.verify({
      payload: body,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const next = statusForEvent(event.type);
  if (!next) return new Response(null, { status: 204 });

  const data = event.data as {
    email_id: string;
    bounce?: { type?: string; subType?: string; message?: string };
    failed?: { reason?: string };
  };

  const payload = await getPayload({ config });
  try {
    const { docs } = await payload.find({
      collection: "deliveries",
      where: { providerMessageId: { equals: data.email_id } },
      limit: 1,
      depth: 0,
      pagination: false,
    });
    const delivery = docs[0];

    if (!delivery) {
      const age = Date.now() - Date.parse(event.created_at);
      if (age < UNMATCHED_RETRY_WINDOW_MS) return new Response("Unknown email, retry later", { status: 404 });
      return new Response(null, { status: 204 });
    }

    // One conditional UPDATE, so two webhooks racing for the same Delivery
    // cannot move it backwards. A repeat or out-of-date event matches no row.
    const error =
      next === "bounced"
        ? `Bounced (${[data.bounce?.type, data.bounce?.subType].filter(Boolean).join(", ") || "unknown"}): ${data.bounce?.message ?? ""}`.trim()
        : next === "complained"
          ? "The recipient reported this email as spam."
          : next === "failed"
            ? `Failed: ${data.failed?.reason ?? "unknown reason"}`
            : null;
    const db = (payload.db as unknown as PostgresAdapter).drizzle;
    await db.execute(sql`
      UPDATE "payload"."deliveries"
      SET "status" = ${next},
          "status_updated_at" = ${event.created_at},
          "error" = COALESCE(${error}, "error"),
          "updated_at" = now()
      WHERE "id" = ${delivery.id} AND "status" IN ${allowedFrom(next)}
    `);

    if (next === "complained" || (next === "bounced" && isHardBounce(data.bounce?.type))) {
      await suppressPerson(payload, delivery.toEmail, next);
    }

    const entryId = typeof delivery.guestlistEntry === "object" ? delivery.guestlistEntry?.id : delivery.guestlistEntry;
    if (entryId) await refreshGuestlistEntry(payload, entryId);

    return new Response(null, { status: 204 });
  } catch (error) {
    payload.logger.error({ err: error, msg: `Resend webhook: ${event.type} for ${data.email_id} failed` });
    return new Response(null, { status: 500 });
  }
}

// A complaint always wins over a bounce as the recorded reason.
async function suppressPerson(payload: Payload, email: string, reason: "bounced" | "complained") {
  const { docs } = await payload.find({
    collection: "people",
    where: { email: { equals: email.toLowerCase() } },
    limit: 1,
    depth: 0,
    pagination: false,
  });
  const person = docs[0];
  if (!person) return;
  if (person.emailSuppressed && (person.suppressedReason === "complained" || reason === "bounced")) return;

  await payload.update({
    collection: "people",
    id: person.id,
    data: { emailSuppressed: true, suppressedReason: reason },
  });
}

// Recomputed from the Deliveries rather than copied from this one event, so
// the summary always reflects the newest email, whatever order events land in.
async function refreshGuestlistEntry(payload: Payload, entryId: number) {
  const latest = (extra: Where = {}) =>
    payload
      .find({
        collection: "deliveries",
        where: { and: [{ guestlistEntry: { equals: entryId } }, extra] },
        sort: "-createdAt",
        limit: 1,
        depth: 0,
        pagination: false,
      })
      .then(({ docs }) => docs[0] as Delivery | undefined);

  const [lastEmail, lastInvite] = await Promise.all([
    latest(),
    latest({ kind: { in: [...INVITE_KINDS] } }),
  ]);

  await payload.update({
    collection: "guestlist",
    id: entryId,
    data: {
      lastEmailStatus: lastEmail?.status ?? null,
      lastInviteStatus: lastInvite?.status ?? null,
      lastEmailAt: lastEmail ? (lastEmail.sentAt ?? lastEmail.createdAt) : null,
    },
  });
}
