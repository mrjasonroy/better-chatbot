import {
  defaultStatements as betterAuthDefaultStatements,
  adminAc,
  userAc,
} from "better-auth/plugins/admin/access";

import { createAccessControl } from "better-auth/plugins/access";
import {
  Resource,
  PermissionType,
  PERMISSION_TYPES,
} from "app-types/permissions";

const appPermissions: Record<Resource, Partial<PermissionType>[]> = {
  workflow: [...Object.values(PERMISSION_TYPES)],
  agent: [...Object.values(PERMISSION_TYPES)],
  mcp: [...Object.values(PERMISSION_TYPES)],
  chat: [...Object.values(PERMISSION_TYPES)],
  temporaryChat: [...Object.values(PERMISSION_TYPES)],
} as const;

// Default statements for all roles
const defaultStatements = {
  ...betterAuthDefaultStatements,
  ...appPermissions,
  // user has access to their own user data objects
  ...userAc.statements,
} as const;

const userStatements: Record<Resource, Partial<PermissionType>[]> = {
  workflow: ["view", "use", "list"],
  agent: ["view", "use", "list"],
  mcp: ["view", "use", "list"],
  chat: [...Object.values(PERMISSION_TYPES)],
  temporaryChat: [...Object.values(PERMISSION_TYPES)],
} as const;

// Assing default statements to all roles
export const ac = createAccessControl(defaultStatements);

export const user = ac.newRole({
  ...defaultStatements,
  // override default statements with user statements
  ...userStatements,
});
export const editor = ac.newRole({
  ...defaultStatements,
});

export const admin = ac.newRole({
  ...defaultStatements,
  ...adminAc.statements,
});
