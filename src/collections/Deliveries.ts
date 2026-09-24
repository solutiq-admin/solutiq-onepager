import type { CollectionConfig } from "payload";

import { isAnyRole, nobody } from "../access";
import { deliveryStatusOptions } from "./Guestlist";

// One row per email sent. Written only by system code through the Local API
// (overrideAccess). With no update access, the admin shows every row read-only.
export const Deliveries: CollectionConfig = {
  slug: "deliveries",
  labels: {
    singular: "Delivery",
    plural: "Deliveries",
  },
  admin: {
    useAsTitle: "toEmail",
    defaultColumns: ["toEmail", "event", "kind", "status", "sentAt", "statusUpdatedAt"],
    group: "Events",
    description: "“Delivered” means the recipient's mail server accepted the email, not that it was read.",
  },
  defaultSort: "-createdAt",
  access: {
    create: nobody,
    read: isAnyRole,
    update: nobody,
    delete: nobody,
  },
  fields: [
    { name: "event", type: "relationship", relationTo: "events", required: true, index: true },
    { name: "guestlistEntry", type: "relationship", relationTo: "guestlist", index: true },
    { name: "message", type: "relationship", relationTo: "messages", index: true },
    { name: "toEmail", type: "email", required: true },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Confirmation", value: "confirmation" },
        { label: "Bulk", value: "bulk" },
        { label: "Invite", value: "invite" },
        { label: "Update", value: "update" },
        { label: "Cancel", value: "cancel" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "queued",
      index: true,
      options: deliveryStatusOptions,
    },
    { name: "providerMessageId", type: "text", index: true },
    { name: "error", type: "textarea" },
    { name: "sentAt", type: "date" },
    { name: "statusUpdatedAt", type: "date" },
    {
      // "confirmation:<guestlist entry id>" on automatic confirmations, empty
      // otherwise. The unique index lets the database refuse a second
      // confirmation for the same person and event, even under a race.
      name: "dedupeKey",
      type: "text",
      unique: true,
      admin: { hidden: true },
    },
  ],
};
