import type { Payload, PayloadRequest } from "payload";

import type { FormOptionList } from "../../collections/FormOptions";
import { STANDARD_FIELDS, type StandardField } from "../../fields/standardFields";

// Starting options and the Default RSVP template for the registration form,
// called once from migrations. After that both are managed in the admin;
// never edit this to change live options or questions.

export const FORM_OPTION_SEED: Record<FormOptionList, string[]> = {
  salutation: ["Mr", "Ms", "Mrs", "Miss", "Dr.", "Prof.", "H.E.", "Hon."],
  industry: [
    "Accelerator or Incubator",
    "Central Bank or Regulator",
    "Financial Institution",
    "FinTech",
    "Government / Multilateral Agency",
    "Higher Education",
    "Industry Association or Nonprofit",
    "Media",
    "Professional Services Firm",
    "Retailer, Marketplace or E-Commerce",
    "Telecommunications & Mobile",
    "VC, PE or Other Investor",
    "Established Tech or Solution Provider",
    "None (e.g. Employee in Transition)",
  ],
  "attendance-goal": ["Lead generation", "Networking", "Thought leadership"],
};

// Skips any list that already has options, so it is safe to run twice.
export async function seedFormOptions(payload: Payload, req: PayloadRequest) {
  for (const [list, labels] of Object.entries(FORM_OPTION_SEED) as [FormOptionList, string[]][]) {
    const { totalDocs } = await payload.count({
      collection: "form-options",
      where: { list: { equals: list } },
      req,
    });
    if (totalDocs > 0) continue;
    for (const [i, label] of labels.entries()) {
      await payload.create({
        collection: "form-options",
        data: { label, list, sortOrder: (i + 1) * 10, active: true },
        req,
      });
    }
  }
}

const DEFAULT_TEMPLATE_FIELDS: StandardField[] = [
  "salutation",
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "organisation",
  "industry",
  "attendanceGoals",
];

// Skips if a default template already exists.
export async function seedDefaultTemplate(payload: Payload, req: PayloadRequest) {
  const { totalDocs } = await payload.count({
    collection: "form-templates",
    where: { isDefault: { equals: true } },
    req,
  });
  if (totalDocs > 0) return;
  await payload.create({
    collection: "form-templates",
    data: {
      name: "Default RSVP",
      description: "The standard RSVP questions, copied into every new event.",
      isDefault: true,
      extraFields: DEFAULT_TEMPLATE_FIELDS.map((field) => ({
        standard: field,
        name: field,
        label: STANDARD_FIELDS[field].label,
        type: "text" as const,
        required: true,
      })),
    },
    req,
  });
}
