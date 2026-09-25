import type { UIFieldServerProps } from "payload";

import { DELIVERED_MEANS } from "@/lib/email/delivery-status";

import { DeliveryStatusBadge } from "./DeliveryStatus";

const KIND_LABEL = {
  confirmation: "Confirmation",
  bulk: "Message",
  invite: "Invite",
  update: "Update",
  cancel: "Cancellation",
} as const;

const formatWhen = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const cell = { padding: "6px 12px 6px 0", verticalAlign: "top", textAlign: "left" } as const;

// Guestlist edit view: every email this person was sent for this event,
// newest first. Read-only; Deliveries are written only by system code.
// Runs as the logged-in user, so it shows only what they may read.
export async function DeliveryHistory({ id, payload, req }: UIFieldServerProps) {
  if (!id) return null;

  const { docs } = await payload
    .find({
      collection: "deliveries",
      where: { guestlistEntry: { equals: id } },
      sort: "-createdAt",
      depth: 1,
      pagination: false,
      overrideAccess: false,
      req,
    })
    .catch(() => ({ docs: [] }));

  const adminRoute = payload.config.routes.admin;

  return (
    <div className="field-type" style={{ marginTop: "var(--base)" }}>
      <h3 style={{ marginBottom: "calc(var(--base) / 4)" }}>Delivery history</h3>
      <p style={{ marginBottom: "calc(var(--base) / 2)", color: "var(--theme-elevation-500)" }}>{DELIVERED_MEANS}</p>

      {docs.length === 0 ? (
        <p>No emails sent to this guest for this event yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--theme-elevation-500)", borderBottom: "1px solid var(--theme-elevation-150)" }}>
                <th style={cell}>Email</th>
                <th style={cell}>Status</th>
                <th style={cell}>Updated</th>
                <th style={cell}>To</th>
                <th style={cell}>Error</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((delivery) => {
                const subject =
                  typeof delivery.message === "object" && delivery.message ? delivery.message.subject : undefined;
                const at = delivery.statusUpdatedAt ?? delivery.sentAt ?? delivery.createdAt;
                return (
                  <tr key={delivery.id} style={{ borderBottom: "1px solid var(--theme-elevation-100)" }}>
                    <td style={cell}>
                      <a href={`${adminRoute}/collections/deliveries/${delivery.id}`}>{KIND_LABEL[delivery.kind]}</a>
                      {subject && <div style={{ color: "var(--theme-elevation-500)" }}>{subject}</div>}
                    </td>
                    <td style={cell}>
                      <DeliveryStatusBadge status={delivery.status} />
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatWhen.format(new Date(at))}</td>
                    <td style={cell}>{delivery.toEmail}</td>
                    <td style={{ ...cell, color: delivery.status === "suppressed" ? "var(--theme-elevation-500)" : "var(--theme-error-500)" }}>
                      {delivery.error ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
