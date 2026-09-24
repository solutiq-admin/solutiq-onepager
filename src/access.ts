import type { Access, FieldAccess } from "payload";

// All role logic for the admin lives in this file. Collections import these
// functions; they never inspect `user.role` themselves.
//
// super-admin   everything, including deletes and managing users
// event-manager create/edit events, templates, guestlist, People; send messages
// list-viewer   read-only on People, Guestlist and Deliveries
//
// Anonymous requests are always denied. Public pages read server-side and
// write through the Local API with `overrideAccess: true`.

export const ROLES = ["super-admin", "event-manager", "list-viewer"] as const;
export type Role = (typeof ROLES)[number];

// Loose on purpose: access functions get a User, the admin UI a ClientUser.
type MaybeUser =
  | { id?: number | string; collection?: string; role?: unknown }
  | null
  | undefined;

const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
  Boolean(
    user && user.collection === "users" && roles.includes(user.role as Role),
  );

// Collection-level access

export const isSuperAdmin: Access = ({ req: { user } }) =>
  hasRole(user, "super-admin");

export const isManager: Access = ({ req: { user } }) =>
  hasRole(user, "super-admin", "event-manager");

export const isAnyRole: Access = ({ req: { user } }) =>
  hasRole(user, "super-admin", "event-manager", "list-viewer");

// Super-admins see every user; everyone else sees only their own record.
export const superAdminOrSelf: Access = ({ req: { user } }) => {
  if (hasRole(user, "super-admin")) return true;
  if (user && hasRole(user, "event-manager", "list-viewer")) {
    return { id: { equals: user.id } };
  }
  return false;
};

// Field-level access

export const superAdminField: FieldAccess = ({ req: { user } }) =>
  hasRole(user, "super-admin");

// Admin UI visibility

export const hiddenUnlessSuperAdmin = ({ user }: { user: MaybeUser }) =>
  !hasRole(user, "super-admin");
