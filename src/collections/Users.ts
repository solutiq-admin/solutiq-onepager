import type { CollectionConfig } from "payload";
import { email } from "payload/shared";

import {
  hiddenUnlessSuperAdmin,
  isSuperAdmin,
  ROLES,
  SENDER_DOMAIN as EMAIL_DOMAIN,
  superAdminField,
  superAdminOrSelf,
} from "../access";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email", "role"],
    group: "Settings",
    hidden: hiddenUnlessSuperAdmin,
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    tokenExpiration: 8 * 60 * 60, // 8 hours, one working day
    cookies: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    },
  },
  access: {
    create: isSuperAdmin,
    read: superAdminOrSelf,
    update: superAdminOrSelf,
    delete: isSuperAdmin,
    unlock: isSuperAdmin,
  },
  hooks: {
    beforeChange: [
      // The first user in an empty system becomes super-admin.
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const { totalDocs } = await req.payload.count({
          collection: "users",
          req,
        });
        if (totalDocs === 0) data.role = "super-admin";
        return data;
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      // Merged with Payload's built-in auth email field.
      name: "email",
      type: "email",
      access: {
        update: superAdminField,
      },
      admin: {
        description: `Must end in ${EMAIL_DOMAIN}. This is the sender address for bulk emails.`,
      },
      validate: (value, options) => {
        const base = email(value, options);
        if (base !== true) return base;
        if (!value?.toLowerCase().trim().endsWith(EMAIL_DOMAIN)) {
          return `Email must end in ${EMAIL_DOMAIN}.`;
        }
        return true;
      },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "list-viewer",
      saveToJWT: true,
      options: ROLES.map((role) => ({ label: role, value: role })),
      access: {
        create: superAdminField,
        update: superAdminField,
      },
      admin: {
        position: "sidebar",
      },
    },
  ],
};
