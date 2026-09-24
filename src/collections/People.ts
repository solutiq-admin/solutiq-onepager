import { randomBytes } from "node:crypto";
import type { CollectionConfig } from "payload";

import { isAnyRole, isManager, isSuperAdmin, superAdminField } from "../access";

// Read-only for everyone except super-admin. The webhook and unsubscribe
// code write these through the Local API, which bypasses access.
const superAdminWriteOnly = {
  create: superAdminField,
  update: superAdminField,
};

export const People: CollectionConfig = {
  slug: "people",
  labels: {
    singular: "Person",
    plural: "People",
  },
  admin: {
    useAsTitle: "fullName",
    defaultColumns: ["fullName", "email", "organisation", "type", "updatedAt"],
    group: "People",
  },
  access: {
    create: isManager,
    read: isAnyRole,
    update: isManager,
    delete: isSuperAdmin, // POPIA erasure requests
  },
  fields: [
    {
      name: "fullName",
      type: "text",
      required: true,
    },
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string" ? value.toLowerCase().trim() : value,
        ],
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "guest",
      options: [
        { label: "Guest", value: "guest" },
        { label: "Partner", value: "partner" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "organisation",
      type: "text",
    },
    {
      name: "internalNotes",
      type: "textarea",
      admin: {
        description: "Staff only. Never shown to the person or included in emails.",
      },
    },
    {
      name: "futureEventsConsent",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "marketingOptOut",
      type: "checkbox",
      defaultValue: false,
      access: superAdminWriteOnly,
      admin: {
        position: "sidebar",
        description: "Set when the person unsubscribes.",
      },
    },
    {
      name: "emailSuppressed",
      type: "checkbox",
      defaultValue: false,
      access: superAdminWriteOnly,
      admin: {
        position: "sidebar",
        description: "Set by the delivery webhook after a hard bounce or complaint.",
      },
    },
    {
      name: "suppressedReason",
      type: "select",
      options: [
        { label: "Bounced", value: "bounced" },
        { label: "Complained", value: "complained" },
      ],
      access: superAdminWriteOnly,
      admin: {
        position: "sidebar",
        condition: (data) => Boolean(data?.emailSuppressed),
      },
    },
    {
      name: "unsubscribeToken",
      type: "text",
      unique: true,
      defaultValue: () => randomBytes(24).toString("base64url"),
      access: superAdminWriteOnly,
      admin: {
        hidden: true,
      },
    },
    {
      name: "createdVia",
      type: "text",
      admin: {
        position: "sidebar",
        description: "Where this record came from, e.g. quick-add or shared-link.",
      },
    },
  ],
};
