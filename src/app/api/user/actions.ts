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

export const updateUserDetailsAction =
  validatedActionWithUserOrAdminAccessCheck(
    UpdateUserDetailsSchema,
    async (data, _, userId): Promise<UpdateUserActionState> => {
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
          message: "User not found",
        };
      }
      return {
        success: true,
        message: "User details updated successfully",
        user,
      };
    },
  );

export const deleteUserAction = validatedActionWithAdminAccessCheck(
  DeleteUserSchema,
  async (data, _): Promise<DeleteUserActionState> => {
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
        message: "Failed to delete user",
      };
    }

    return {
      success: true,
      message: "User deleted successfully",
      redirect: "/admin",
    };
  },
);

export const updateUserPasswordAction = validatedActionWithAdminAccessCheck(
  UpdateUserPasswordSchema,
  async (data, _): Promise<UpdateUserPasswordActionState> => {
    const { userId, newPassword } = data;
    const { hasPassword } = await getUserAccounts(userId);
    if (!hasPassword) {
      return {
        success: false,
        message: "User has no password based account",
      };
    }
    try {
      await auth.api.setUserPassword({
        body: { userId, newPassword },
        headers: await headers(),
      });
      return {
        success: true,
        message: "User password updated successfully",
      };
    } catch (_error) {
      return {
        success: false,
        message: "Failed to update user password",
      };
    }
  },
);
