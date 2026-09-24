import type { CollectionConfig } from "payload";

import { isManager, isSuperAdmin, systemOnlyField } from "../access";

const systemOnly = { create: systemOnlyField, update: systemOnlyField };

// A bulk email to an event's guestlist. Sending is built in Phase F1.
export const Messages: CollectionConfig = {
  slug: "messages",
  admin: {
    useAsTitle: "subject",
    defaultColumns: ["subject", "event", "audience", "calendar", "status", "sentAt"],
    group: "Events",
  },
  defaultSort: "-createdAt",
  access: {
    create: isManager,
    read: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: {
    beforeChange: [
      // The sender is always the logged-in user who created the message.
      ({ data, operation, req }) => {
        if (operation === "create" && req.user) data.sender = req.user.id;
        return data;
      },
    ],
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
      name: "subject",
      type: "text",
      required: true,
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      admin: {
        rows: 12,
        description:
          "Plain text. Variables: {{firstName}}, {{eventTitle}}, {{eventDate}}, {{venueName}}, {{registrationLink}}",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "audience",
          type: "select",
          required: true,
          defaultValue: "all-guestlist",
          options: [
            { label: "Everyone on the guestlist", value: "all-guestlist" },
            { label: "Not yet registered", value: "not-yet-registered" },
            { label: "Registered", value: "registered" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "calendar",
          label: "Calendar attachment",
          type: "select",
          required: true,
          defaultValue: "none",
          options: [
            { label: "None", value: "none" },
            { label: "Invite", value: "invite" },
            { label: "Update", value: "update" },
            { label: "Cancel", value: "cancel" },
          ],
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sending", value: "sending" },
        { label: "Sent", value: "sent" },
        { label: "Partial", value: "partial" },
      ],
      access: systemOnly,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "sender",
      type: "relationship",
      relationTo: "users",
      access: systemOnly,
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Set to whoever creates the message. Emails go out from this address.",
      },
    },
    {
      name: "sentAt",
      type: "date",
      access: systemOnly,
      admin: {
        readOnly: true,
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
      },
    },
  ],
};
