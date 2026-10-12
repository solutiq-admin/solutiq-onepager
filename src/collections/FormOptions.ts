import { revalidatePath } from "next/cache";
import type { CollectionConfig } from "payload";

import { isAnyRole, isManager, nobody } from "../access";

export const FORM_OPTION_LISTS = [
  { label: "Salutation", value: "salutation" },
  { label: "Industry", value: "industry" },
  { label: "Attendance goal", value: "attendance-goal" },
] as const;

export type FormOptionList = (typeof FORM_OPTION_LISTS)[number]["value"];

// Choices for the fixed registration form. Options are never deleted:
// registrations and People keep a link to the option plus a copy of its
// label, so retiring one means unticking Active.
export const FormOptions: CollectionConfig = {
  slug: "form-options",
  labels: {
    singular: "Form option",
    plural: "Form options",
  },
  defaultSort: ["list", "sortOrder"],
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "list", "sortOrder", "active"],
    group: "Events",
    description:
      "Salutation, industry and attendance-goal choices on every registration form. Untick Active to retire an option; past registrations keep their answer.",
  },
  indexes: [{ fields: ["list", "label"], unique: true }],
  access: {
    create: isManager,
    read: isAnyRole,
    update: isManager,
    delete: nobody,
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        // Every event page shows these options. revalidatePath only works
        // inside a Next request; migrations and scripts skip it.
        try {
          revalidatePath("/(site)/events/[slug]", "page");
        } catch {
          // Nothing to revalidate outside a request.
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: "label",
      type: "text",
      required: true,
      admin: {
        description: "As guests see it. Renaming doesn't change answers already given.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "list",
          type: "select",
          required: true,
          index: true,
          options: [...FORM_OPTION_LISTS],
          admin: { width: "50%" },
        },
        {
          name: "sortOrder",
          type: "number",
          required: true,
          defaultValue: 100,
          admin: {
            width: "50%",
            description: "Lower numbers come first. Leave gaps (10, 20, 30) to slot options in later.",
          },
        },
      ],
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      index: true,
      admin: {
        description: "Unticked options are hidden from the form but kept on past registrations.",
      },
    },
  ],
};
