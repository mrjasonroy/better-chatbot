import { z } from "zod";
import { USER_ROLES, UserRoleNames } from "app-types/roles";

import { ActionState } from "lib/action-utils";
import { BasicUserWithLastLogin } from "app-types/user";
import { passwordSchema } from "lib/validations/password";

export const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z
    .enum(Object.values(USER_ROLES) as [UserRoleNames, ...UserRoleNames[]])
    .optional(),
});

export const UpdateUserPasswordError = {
  PASSWORD_MISMATCH: "Passwords do not match",
} as const;

export type UpdateUserPasswordError =
  (typeof UpdateUserPasswordError)[keyof typeof UpdateUserPasswordError];

export const UpdateUserDetailsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
});

export const DeleteUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const UpdateUserPasswordSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: UpdateUserPasswordError.PASSWORD_MISMATCH,
      });
    }
  });

export type UpdateUserRoleActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type DeleteUserActionState = ActionState & {
  redirect?: string;
};

export type UpdateUserActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type UpdateUserPasswordActionState = ActionState & {
  error?: UpdateUserPasswordError;
};
