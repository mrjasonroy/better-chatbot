"use server";

import { userRepository } from "lib/db/repository";
import {
  validatedActionWithAdminAccessCheck,
  validatedActionWithUserOrAdminAccessCheck,
} from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import {
  UpdateUserDetailsSchema,
  DeleteUserSchema,
  UpdateUserPasswordSchema,
  UpdateUserActionState,
  DeleteUserActionState,
  UpdateUserPasswordActionState,
} from "./validations";
import { getUserAccounts } from "lib/user/server";
import { getTranslations } from "next-intl/server";

export const updateUserDetailsAction =
  validatedActionWithUserOrAdminAccessCheck(
    UpdateUserDetailsSchema,
    async (data, _, userId): Promise<UpdateUserActionState> => {
      const t = await getTranslations("User.Profile.common");
      const { name, email } = data;
      await userRepository.updateUserDetails({
        userId,
        name,
        email,
      });
      const user = await userRepository.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: t("userNotFound"),
        };
      }
      return {
        success: true,
        message: t("userDetailsUpdatedSuccessfully"),
        user,
      };
    },
  );

export const deleteUserAction = validatedActionWithAdminAccessCheck(
  DeleteUserSchema,
  async (data, _): Promise<DeleteUserActionState> => {
    const t = await getTranslations("Admin.UserDelete");
    const { userId } = data;
    try {
      await auth.api.removeUser({
        body: { userId },
        headers: await headers(),
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      return {
        success: false,
        message: t("failedToDeleteUser"),
      };
    }

    return {
      success: true,
      message: t("userDeletedSuccessfully"),
      redirect: "/admin",
    };
  },
);

export const updateUserPasswordAction = validatedActionWithAdminAccessCheck(
  UpdateUserPasswordSchema,
  async (data, _): Promise<UpdateUserPasswordActionState> => {
    const t = await getTranslations("User.Profile.common");
    const { userId, newPassword } = data;
    const { hasPassword } = await getUserAccounts(userId);
    if (!hasPassword) {
      return {
        success: false,
        message: t("userHasNoPasswordAccount"),
      };
    }
    try {
      await auth.api.setUserPassword({
        body: { userId, newPassword },
        headers: await headers(),
      });
      return {
        success: true,
        message: t("passwordUpdatedSuccessfully"),
      };
    } catch (_error) {
      return {
        success: false,
        message: t("failedToUpdatePassword"),
      };
    }
  },
);
