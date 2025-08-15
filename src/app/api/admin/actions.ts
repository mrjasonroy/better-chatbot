"use server";

import { userRepository } from "lib/db/repository";
import { validatedActionWithAdminAccessCheck } from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import { DEFAULT_USER_ROLE, userRolesInfo } from "app-types/roles";
import { UpdateUserRoleSchema, UpdateUserRoleActionState } from "./validations";

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
