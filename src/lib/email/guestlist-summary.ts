import type { Payload, Where } from "payload";

import type { Delivery } from "@/payload-types";

import { INVITE_KINDS } from "./delivery-status";

// Refreshes a Guestlist entry's lastEmailStatus, lastInviteStatus and
// lastEmailAt. Recomputed from the Deliveries rather than copied from one
// event, so the summary always reflects the newest email, whatever order
// sends and webhooks land in. Used by the webhook and the bulk sender.
export async function refreshGuestlistEntry(payload: Payload, entryId: number) {
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
