import type { CollectionConfig } from "payload";

import { isManager } from "../access";
import { questionsField } from "../fields/questions";

// Reusable sets of registration questions. Applying one to an event copies
// the questions, so editing or deleting a template never changes an event.
export const FormTemplates: CollectionConfig = {
  slug: "form-templates",
  labels: {
    singular: "Form template",
    plural: "Form templates",
  },
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "description", "questionCount", "updatedAt"],
    group: "Events",
    description: "Reusable registration questions. Name, email and consent are always added in code.",
  },
  access: {
    create: isManager,
    read: isManager,
    update: isManager,
    delete: isManager,
  },
  fields: [
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
