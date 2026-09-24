import type { CollectionConfig } from "payload";

// Minimal so the admin can boot. Roles, email-domain validation and
// lockout hardening land in Phase C1 (see docs/event-registration-guide.md).
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  fields: [],
};
