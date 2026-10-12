import { randomBytes } from "node:crypto";
import type { CollectionConfig } from "payload";

import { isAnyRole, isManager, isSuperAdmin, superAdminField } from "../access";
import { optionFields } from "../fields/formOptions";

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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.fullName?.trim()) {
          const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
          if (name) data.fullName = name;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "fullName",
      type: "text",
      required: true,
      admin: {
        description: "Used in emails. Filled from first and last name if left empty.",
      },
    },
    optionFields({
      list: "salutation",
      relationName: "salutationOption",
      labelName: "salutation",
      label: "Salutation",
    }),
    {
      type: "row",
      fields: [
        { name: "firstName", type: "text", admin: { width: "50%" } },
        { name: "lastName", type: "text", admin: { width: "50%" } },
      ],
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
      type: "row",
      fields: [
        { name: "jobTitle", type: "text", admin: { width: "50%" } },
        { name: "organisation", type: "text", admin: { width: "50%" } },
      ],
    },
    optionFields({
      list: "industry",
      relationName: "industryOption",
      labelName: "industry",
      label: "Industry",
    }),
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
