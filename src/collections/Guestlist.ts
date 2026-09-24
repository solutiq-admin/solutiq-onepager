import { randomBytes } from "node:crypto";
import type { CollectionConfig, Field } from "payload";

import { isAnyRole, isManager, systemOnlyField } from "../access";

const DELIVERY_STATUSES = [
  "queued",
  "sent",
  "delayed",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "suppressed",
] as const;

export const deliveryStatusOptions = DELIVERY_STATUSES.map((value) => ({
  label: value[0].toUpperCase() + value.slice(1),
  value,
}));

// Written only by the delivery code, which uses the Local API.
const systemOnly = { create: systemOnlyField, update: systemOnlyField };

const deliverySummaryFields: Field[] = [
  {
    name: "lastInviteStatus",
    type: "select",
    options: deliveryStatusOptions,
    index: true,
    access: systemOnly,
    admin: { readOnly: true, position: "sidebar" },
  },
  {
    name: "lastEmailStatus",
    type: "select",
    options: deliveryStatusOptions,
    index: true,
    access: systemOnly,
    admin: { readOnly: true, position: "sidebar" },
  },
  {
    name: "lastEmailAt",
    type: "date",
    access: systemOnly,
    admin: {
      readOnly: true,
      position: "sidebar",
      date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
    },
  },
];

// One row per person per event.
export const Guestlist: CollectionConfig = {
  slug: "guestlist",
  labels: {
    singular: "Guestlist entry",
    plural: "Guestlist",
  },
  admin: {
    defaultColumns: [
      "person",
      "personEmail",
      "event",
      "status",
      "source",
      "lastInviteStatus",
      "lastEmailStatus",
      "lastEmailAt",
    ],
    group: "Events",
  },
  defaultSort: "-createdAt",
  indexes: [{ fields: ["event", "person"], unique: true }],
  access: {
    create: isManager,
    read: isAnyRole,
    update: isManager,
    delete: isManager,
  },
  fields: [
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      required: true,
      index: true,
    },
    {
      name: "person",
      type: "relationship",
      relationTo: "people",
      required: true,
      index: true,
    },
    {
      name: "personEmail",
      label: "Email",
      type: "ui",
      admin: {
        components: {
          Cell: "@/components/admin/PersonEmailCell#PersonEmailCell",
        },
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "invited",
          index: true,
          options: [
            { label: "Invited", value: "invited" },
            { label: "Registered", value: "registered" },
            { label: "Cancelled", value: "cancelled" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "source",
          type: "select",
          required: true,
          defaultValue: "manual",
          index: true,
          options: [
            { label: "Guestlist", value: "guestlist" },
            { label: "Shared link", value: "shared-link" },
            { label: "Manual", value: "manual" },
          ],
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "registeredAt",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
      },
    },
    {
      name: "responses",
      type: "json",
      admin: {
        description: "Answers to the event's registration questions.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "consentVersion",
          type: "text",
          access: systemOnly,
          admin: {
            width: "50%",
            readOnly: true,
            description: "Version of the POPIA consent wording the person agreed to.",
          },
        },
        {
          name: "consentedAt",
          type: "date",
          access: systemOnly,
          admin: {
            width: "50%",
            readOnly: true,
            date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
          },
        },
      ],
    },
    {
      name: "token",
      type: "text",
      unique: true,
      index: true,
      defaultValue: () => randomBytes(24).toString("base64url"),
      access: systemOnly,
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Personal registration link key. Generated automatically.",
      },
    },
    ...deliverySummaryFields,
  ],
};
