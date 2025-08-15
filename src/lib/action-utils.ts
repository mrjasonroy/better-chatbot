import "server-only";
import { z } from "zod";
import { UserSessionUser } from "app-types/user";

import { getSession } from "auth/server";
import { requireAdminSession } from "./admin/server";
import { USER_ROLES } from "app-types/roles";

// Type constraint for schemas that can have optional userId
type SchemaWithOptionalUserId = z.ZodType<{ userId?: string }, any>;

export type ActionState =
  | {
      success?: boolean;
      message?: string;
      [key: string]: any;
    }
  | null
  | undefined;

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>,
) {
  return async (_prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: UserSessionUser,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) {
  return async (_prevState: ActionState, formData: FormData) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    if (!session || !session.user) {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.errors[0].message,
      } as T;
    }

    return action(result.data, formData, session.user);
  };
}

type ValidatedActionWithAdminAccess<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  adminUser: UserSessionUser,
) => Promise<T>;

export function validatedActionWithAdminAccessCheck<
  S extends z.ZodType<any, any>,
  T,
>(schema: S, action: ValidatedActionWithAdminAccess<S, T>) {
  return async (_prevState: ActionState, formData: FormData) => {
    let adminUser: UserSessionUser | null = null;
    try {
      const { user } = await requireAdminSession();
      adminUser = user;
    } catch (_error) {
      return {
        success: false,
        message: "You are not authorized to perform this action",
      } as T;
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.errors[0].message,
      } as T;
    }

    return action(result.data, formData, adminUser);
  };
}

type ValidatedActionWithUserOrAdminAccess<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  userId: string,
  isAdmin: boolean,
) => Promise<T>;

export function validatedActionWithUserOrAdminAccessCheck<
  S extends SchemaWithOptionalUserId,
  T,
>(schema: S, action: ValidatedActionWithUserOrAdminAccess<S, T>) {
  return async (_prevState: ActionState, formData: FormData) => {
    let userSession;
    try {
      userSession = await getSession();
    } catch {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }

    if (!userSession || !userSession.user) {
      return {
        success: false,
        message: "User is not authenticated",
      } as T;
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        success: false,
        message: result.error.errors[0].message,
      } as T;
    }
    const isAdmin = userSession.user.role === USER_ROLES.ADMIN;
    const userId = result.data.userId || userSession.user.id;
    const isAllowed = (isAdmin && userId) || userId === userSession.user.id;
    if (!isAllowed) {
      return {
        success: false,
        message: "You are not authorized to perform this action",
      } as T;
    }

    return action(result.data, formData, userId, isAdmin);
  };
}
