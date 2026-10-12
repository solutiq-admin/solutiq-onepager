import type { CollectionConfig } from "payload";
import { APIError } from "payload";

import { isManager } from "../access";
import { questionsField } from "../fields/questions";

// Reusable sets of registration questions. Applying one to an event copies
// the questions, so editing or deleting a template never changes an event.
// The default template is copied into every new event; it can't be deleted.
export const FormTemplates: CollectionConfig = {
  slug: "form-templates",
  labels: {
    singular: "Form template",
    plural: "Form templates",
  },
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "description", "isDefault", "questionCount", "updatedAt"],
    group: "Events",
    description:
      "Reusable registration questions. The default template is copied into every new event. Consent is always added in code.",
  },
  access: {
    create: isManager,
    read: isManager,
    update: isManager,
    delete: isManager,
  },
  hooks: {
    // Only one default: ticking it here unticks it everywhere else.
    afterChange: [
      async ({ doc, req }) => {
        if (!doc.isDefault) return doc;
        await req.payload.update({
          collection: "form-templates",
          where: { and: [{ isDefault: { equals: true } }, { id: { not_equals: doc.id } }] },
          data: { isDefault: false },
          req,
        });
        return doc;
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const template = await req.payload.findByID({ collection: "form-templates", id, depth: 0, req });
        if (template.isDefault) {
          throw new APIError("The default template can't be deleted. Make another template the default first.", 400, null, true);
        }
      },
    ],
  },
  fields: [
    {
      name: "isDefault",
      label: "Default for new events",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Copied into every new event. Only one template can be the default.",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "description",
      type: "text",
      admin: {
        placeholder: "e.g. Guests, dietary and plus-one",
      },
    },
    questionsField,
    {
      name: "questionCount",
      label: "Questions",
      type: "ui",
      admin: {
        components: {
          Cell: "@/components/admin/QuestionCountCell#QuestionCountCell",
        },
      },
    },
  ],
};
