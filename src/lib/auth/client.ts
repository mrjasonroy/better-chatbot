"use client";

import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { adminClient } from "better-auth/client/plugins";

import { DEFAULT_USER_ROLE, USER_ROLES } from "app-types/roles";
import { ac, admin, editor, user } from "./roles";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      defaultRole: DEFAULT_USER_ROLE,
      adminRoles: [USER_ROLES.ADMIN],
      ac,
      roles: {
        admin,
        editor,
        user,
      },
    }),
  ],
});
