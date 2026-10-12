import { revalidatePath } from "next/cache";
import type { CollectionConfig } from "payload";
import { ValidationError } from "payload";

import { isAnyRole, isManager, isSuperAdmin, systemOnlyField } from "../access";
import { copyQuestions, questionsField } from "../fields/questions";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// A change to any of these makes existing calendar invites stale.
const CALENDAR_FIELDS = ["startsAt", "endsAt", "venueName", "venueAddress", "status"] as const;

const DATE_FIELDS = new Set<string>(["startsAt", "endsAt"]);

const sameValue = (field: string, a: unknown, b: unknown) =>
  DATE_FIELDS.has(field)
    ? new Date(a as string).getTime() === new Date(b as string).getTime()
    : (a ?? null) === (b ?? null);

// revalidatePath only works inside a Next request; skip it for scripts.
const revalidateEvent = (slug: unknown) => {
  if (typeof slug !== "string" || !slug) return;
  try {
    revalidatePath(`/events/${slug}`);
  } catch {
    // Outside a Next request context (e.g. migrations): nothing to revalidate.
  }
};

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startsAt", "status", "venueName", "updatedAt"],
    group: "Events",
  },
  defaultSort: "-startsAt",
  access: {
    create: isManager,
    read: isAnyRole,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && typeof data.title === "string") {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    beforeChange: [
      // Copy a template's questions into the event, then forget the template.
      async ({ data, originalDoc, req }) => {
        if (!data.applyTemplate) return data;
        const templateId =
          typeof data.applyTemplate === "object" ? data.applyTemplate.id : data.applyTemplate;
        const current = data.extraFields ?? originalDoc?.extraFields ?? [];
        if (current.length > 0) {
          throw new ValidationError({
            collection: "events",
            errors: [
              {
                path: "applyTemplate",
                message: "Clear this event's questions before applying a template.",
              },
            ],
          });
        }
        const template = await req.payload.findByID({
          collection: "form-templates",
          id: templateId,
          depth: 0,
          req,
        });
        data.extraFields = copyQuestions(template.extraFields);
        data.applyTemplate = null;
        return data;
      },
      // Bump the calendar sequence so updated invites replace old ones.
      ({ data, operation, originalDoc }) => {
        if (operation === "create") {
          data.calendarSequence = 0;
          return data;
        }
        const changed = CALENDAR_FIELDS.some(
          (field) => field in data && !sameValue(field, data[field], originalDoc?.[field]),
        );
        const current = originalDoc?.calendarSequence ?? 0;
        data.calendarSequence = changed ? current + 1 : current;
        return data;
      },
    ],
    afterChange: [
      ({ doc, previousDoc }) => {
        revalidateEvent(doc.slug);
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) revalidateEvent(previousDoc.slug);
        return doc;
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidateEvent(doc.slug);
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: "Used in the public link: /events/<slug>. Filled from the title if left empty.",
      },
      validate: (value: string | null | undefined) =>
        value && SLUG.test(value) ? true : "Use lowercase letters, numbers and single hyphens only.",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed" },
        { label: "Cancelled", value: "cancelled" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "startsAt",
          type: "date",
          required: true,
          admin: {
            width: "50%",
            date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
          },
        },
        {
          name: "endsAt",
          type: "date",
          required: true,
          admin: {
            width: "50%",
            date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
          },
          validate: (value: Date | string | null | undefined, { siblingData }: { siblingData: { startsAt?: Date | string } }) => {
            if (!value) return "This field is required.";
            if (siblingData?.startsAt && new Date(value) <= new Date(siblingData.startsAt)) {
              return "The event must end after it starts.";
            }
            return true;
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "venueName", type: "text", required: true, admin: { width: "50%" } },
        { name: "mapUrl", label: "Map link", type: "text", admin: { width: "50%" } },
      ],
    },
    {
      name: "venueAddress",
      type: "textarea",
    },
    {
      name: "description",
      type: "richText",
    },
    {
      type: "collapsible",
      label: "Registration",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "openRegistration",
              label: "Allow registration through the shared link",
              type: "checkbox",
              defaultValue: true,
              admin: {
                width: "50%",
                description: "Off: invite-only. Guests on the guestlist can still use their personal links.",
              },
            },
            {
              name: "capacity",
              type: "number",
              min: 1,
              admin: {
                width: "25%",
                description: "Shared-link registrations only.",
              },
            },
            {
              name: "registrationCloses",
              type: "date",
              admin: {
                width: "25%",
                date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
              },
            },
          ],
        },
        {
          name: "askPhotoConsent",
          label: "Ask guests for photography consent",
          type: "checkbox",
          defaultValue: true,
          admin: {
            description:
              "Adds a required yes/no photography question to the form. Turn off if nobody will take photographs or video.",
          },
        },
        {
          name: "applyTemplate",
          label: "Apply a form template",
          type: "relationship",
          relationTo: "form-templates",
          admin: {
            description:
              "Copies the template's questions into this event when you save. Only works while the event has no questions.",
          },
        },
        questionsField,
        {
          name: "saveAsTemplate",
          type: "ui",
          admin: {
            condition: (data) => Boolean(data?.id),
            disableListColumn: true,
            components: {
              Field: "@/components/admin/SaveAsTemplate#SaveAsTemplate",
            },
          },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Confirmation email",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "hostUser",
              label: "Host",
              type: "relationship",
              relationTo: "users",
              defaultValue: ({ user }) => user?.id,
              admin: { width: "50%" },
            },
            {
              name: "replyToEmail",
              type: "email",
              admin: {
                width: "50%",
                description: "Leave empty to use the host's email.",
              },
              hooks: {
                beforeChange: [
                  async ({ value, siblingData, req }) => {
                    if (value || !siblingData.hostUser) return value;
                    const hostId =
                      typeof siblingData.hostUser === "object"
                        ? siblingData.hostUser.id
                        : siblingData.hostUser;
                    const host = await req.payload.findByID({
                      collection: "users",
                      id: hostId,
                      depth: 0,
                      req,
                    });
                    return host?.email ?? value;
                  },
                ],
              },
            },
          ],
        },
        {
          name: "confirmationNote",
          type: "textarea",
          admin: {
            description: "Added to the end of every confirmation email.",
          },
        },
      ],
    },
    {
      name: "quickAdd",
      type: "ui",
      admin: {
        condition: (data) => Boolean(data?.id),
        disableListColumn: true,
        components: {
          Field: "@/components/admin/QuickAdd#QuickAdd",
        },
      },
    },
    {
      name: "calendarSequence",
      type: "number",
      defaultValue: 0,
      access: {
        create: systemOnlyField,
        update: systemOnlyField,
      },
      admin: {
        hidden: true,
      },
    },
  ],
};
