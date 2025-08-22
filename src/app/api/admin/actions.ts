"use server";

import { userRepository } from "lib/db/repository";
import { validatedActionWithAdminAccessCheck } from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import { DEFAULT_USER_ROLE, userRolesInfo } from "app-types/roles";
import {
  UpdateUserRoleSchema,
  UpdateUserRoleActionState,
  UpdateUserBanStatusSchema,
  UpdateUserBanStatusActionState,
} from "./validations";
import logger from "lib/logger";

export const updateUserRolesAction = validatedActionWithAdminAccessCheck(
  UpdateUserRoleSchema,
  async (data, _, adminUser): Promise<UpdateUserRoleActionState> => {
    const { userId, role: roleInput } = data;

    const role = roleInput || DEFAULT_USER_ROLE;
    if (adminUser.id === userId) {
      return {
        success: false,
        message: "You cannot update your own role",
      };
    }
    await auth.api.setRole({
      body: { userId, role },
      headers: await headers(),
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
      message: `User role updated successfully to ${userRolesInfo[role].label}`,
      user,
    };
  },
);

export const updateUserBanStatusAction = validatedActionWithAdminAccessCheck(
  UpdateUserBanStatusSchema,
  async (data, _, adminUser): Promise<UpdateUserBanStatusActionState> => {
    const { userId, banned, banReason } = data;

    if (adminUser.id === userId) {
      return {
        success: false,
        message: "You cannot ban/unban yourself",
      };
    }
    console.log("updating user ban status", userId, banned, banReason);
    try {
      if (!banned) {
        console.log("banning user", userId, banReason);
        await auth.api.banUser({
          body: { userId, banReason: banReason || "Banned by admin" },
          headers: await headers(),
        });
      } else {
        console.log("unbanning user", userId);
        await auth.api.unbanUser({
          body: { userId },
          headers: await headers(),
        });
      }
      const user = await userRepository.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }
      return {
        success: true,
        message: user.banned
          ? "User banned successfully"
          : "User unbanned successfully",
        user,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: "Failed to update user ban status",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);
