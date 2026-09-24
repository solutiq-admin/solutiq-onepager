// Delivery status rules for the Resend webhook. No imports, so the rules can
// be unit-tested with plain `node --test`.
//
// Status only moves forward: queued -> sent -> delayed -> delivered. The
// problem statuses (bounced, complained, failed) may always override, since
// an async bounce or a complaint can arrive after `delivered`. `suppressed`
// is set by our own send code before anything goes to Resend, never here.

export type DeliveryStatus =
  | "queued"
  | "sent"
  | "delayed"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

const FORWARD: DeliveryStatus[] = ["queued", "sent", "delayed", "delivered"];
const OVERRIDES: DeliveryStatus[] = ["bounced", "complained", "failed"];
const ALL: DeliveryStatus[] = [...FORWARD, ...OVERRIDES, "suppressed"];

// Resend event type -> Delivery status. Anything else (opened, clicked,
// scheduled, contact.*, domain.*) is ignored; open and click tracking stay off.
const EVENT_STATUS: Record<string, DeliveryStatus> = {
  "email.sent": "sent",
  "email.delivery_delayed": "delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export const statusForEvent = (type: string): DeliveryStatus | undefined => EVENT_STATUS[type];

// The current statuses from which a Delivery may move to `next`. The update
// only applies when the row's status is in this list, which makes a repeated
// or out-of-order webhook a no-op.
export function allowedFrom(next: DeliveryStatus): DeliveryStatus[] {
  if (OVERRIDES.includes(next)) return ALL.filter((status) => status !== next);
  const rank = FORWARD.indexOf(next);
  return rank > 0 ? FORWARD.slice(0, rank) : [];
}

// Resend passes the bounce classification through from the receiving server:
// "Permanent" is a hard bounce, "Transient" and "Undetermined" are not.
export const isHardBounce = (bounceType: string | undefined) =>
  bounceType?.toLowerCase() === "permanent";

// Deliveries that carry a calendar attachment. The confirmation always does.
export const INVITE_KINDS = ["confirmation", "invite", "update", "cancel"] as const;
