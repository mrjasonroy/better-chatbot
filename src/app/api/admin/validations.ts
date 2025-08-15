import { z } from "zod";
import { USER_ROLES, UserRoleNames } from "app-types/roles";

import { ActionState } from "lib/action-utils";
import { BasicUserWithLastLogin } from "app-types/user";

export const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z
    .enum(Object.values(USER_ROLES) as [UserRoleNames, ...UserRoleNames[]])
    .optional(),
});

export type UpdateUserRoleActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};
