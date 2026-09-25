import type { DefaultServerCellComponentProps } from "payload";

import { statusTone, type DeliveryStatus, type StatusTone } from "@/lib/email/delivery-status";

// Payload's theme scales flip in dark mode, so these stay legible in both.
const TONE_STYLE: Record<StatusTone, { background: string; color: string }> = {
  delivered: { background: "var(--theme-success-150)", color: "var(--theme-success-800)" },
  "in-progress": { background: "var(--theme-warning-150)", color: "var(--theme-warning-800)" },
  problem: { background: "var(--theme-error-150)", color: "var(--theme-error-800)" },
  skipped: { background: "var(--theme-elevation-100)", color: "var(--theme-elevation-800)" },
};

const TONE_TITLE: Record<StatusTone, string> = {
  delivered: "Accepted by the recipient's mail server (not necessarily read)",
  "in-progress": "On its way",
  problem: "Needs follow-up",
  skipped: "Not sent: unsubscribed or address suppressed",
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const tone = statusTone(status);
  return (
    <span
      title={TONE_TITLE[tone]}
      style={{
        ...TONE_STYLE[tone],
        display: "inline-block",
        padding: "0 8px",
        borderRadius: "var(--style-radius-s)",
        fontSize: "12px",
        lineHeight: "20px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}

// List column for Guestlist.lastInviteStatus and lastEmailStatus.
export function DeliveryStatusCell({ cellData }: DefaultServerCellComponentProps) {
  return typeof cellData === "string" && cellData ? <DeliveryStatusBadge status={cellData as DeliveryStatus} /> : null;
}
