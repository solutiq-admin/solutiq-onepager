import type { Payload } from "payload";

import { DELIVERED_MEANS, PROBLEM_STATUSES } from "@/lib/email/delivery-status";

// The saved "needs follow-up" view: every guestlist entry whose latest email
// or latest calendar invite bounced, failed or drew a complaint. Written in
// the same or/and shape the list view's own filter builder uses, so the
// filter shows up there and can be narrowed to one event.
const followUpQuery = () => {
  const params = new URLSearchParams();
  (["lastEmailStatus", "lastInviteStatus"] as const).forEach((field, i) => {
    PROBLEM_STATUSES.forEach((status, j) => params.append(`where[or][${i}][and][0][${field}][in][${j}]`, status));
  });
  return params.toString();
};

// Guestlist list view, above the table.
export function GuestlistFollowUp({ payload }: { payload: Payload }) {
  const base = `${payload.config.routes.admin}/collections/guestlist`;
  return (
    <div style={{ marginBottom: "var(--base)", display: "flex", flexWrap: "wrap", gap: "calc(var(--base) / 2)", alignItems: "baseline" }}>
      <a className="btn btn--style-secondary btn--size-small" style={{ margin: 0 }} href={`${base}?${followUpQuery()}`}>
        Needs follow-up: bounced, failed or complained
      </a>
      <a href={base}>Show all</a>
      <span style={{ color: "var(--theme-elevation-500)" }}>{DELIVERED_MEANS}</span>
    </div>
  );
}
