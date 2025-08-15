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
import { getTranslations } from "next-intl/server";

export const updateUserRolesAction = validatedActionWithAdminAccessCheck(
  UpdateUserRoleSchema,
  async (data, _, adminUser): Promise<UpdateUserRoleActionState> => {
    const t = await getTranslations("Admin.UserRoles");
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, role: roleInput } = data;

    const role = roleInput || DEFAULT_USER_ROLE;
    if (adminUser.id === userId) {
      return {
        success: false,
        message: t("cannotUpdateOwnRole"),
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
        message: tCommon("userNotFound"),
      };
    }

    return {
      success: true,
      message: t("roleUpdatedSuccessfullyTo", {
        role: userRolesInfo[role].label,
      }),
      user,
    };
  },
);

export const updateUserBanStatusAction = validatedActionWithAdminAccessCheck(
  UpdateUserBanStatusSchema,
  async (data, _, adminUser): Promise<UpdateUserBanStatusActionState> => {
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, banned, banReason } = data;

    if (adminUser.id === userId) {
      return {
        success: false,
        message: tCommon("cannotBanUnbanYourself"),
      };
    }
    console.log("updating user ban status", userId, banned, banReason);
    try {
      if (!banned) {
        console.log("banning user", userId, banReason);
        await auth.api.banUser({
          body: {
            userId,
            banReason:
              banReason ||
              (await getTranslations("User.Profile.common"))("bannedByAdmin"),
          },
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
          message: tCommon("userNotFound"),
        };
      }
      return {
        success: true,
        message: user.banned
          ? tCommon("userBannedSuccessfully")
          : tCommon("userUnbannedSuccessfully"),
        user,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: tCommon("failedToUpdateUserStatus"),
        error: error instanceof Error ? error.message : tCommon("unknownError"),
      };
    }
  },
);
