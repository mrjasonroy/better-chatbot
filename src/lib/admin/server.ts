import "server-only";

import { auth, getSession } from "lib/auth/server";
import { headers } from "next/headers";
import { AdminUsersQuery, AdminUsersPaginated } from "app-types/admin";
import { USER_ROLES } from "app-types/roles";

export const ADMIN_USER_LIST_LIMIT = 10;
export const DEFAULT_SORT_BY = "createdAt";
export const DEFAULT_SORT_DIRECTION = "desc";

/**
 * Require an admin session
 * This is a wrapper around the getSession functio n
 * that throws an error if the user is not an admin
 */
export async function requireAdminSession(): Promise<
  Awaited<ReturnType<typeof getSession>>
> {
  const session = await getSession();

  if (
    !session.user.role?.toLowerCase().includes(USER_ROLES.ADMIN.toLowerCase())
  ) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session;
}

/**
 * Get paginated users using Better Auth's listUsers API
 * Only admins can list and search users
 */
export async function getAdminUsers(
  query?: AdminUsersQuery,
): Promise<AdminUsersPaginated> {
  await requireAdminSession();

  const result = await auth.api.listUsers({
    query: {
      searchValue: query?.searchValue,
      searchField: query?.searchField,
      searchOperator: query?.searchOperator,
      limit: query?.limit ?? ADMIN_USER_LIST_LIMIT,
      offset: query?.offset ?? 0,
      sortBy: query?.sortBy ?? DEFAULT_SORT_BY,
      sortDirection: query?.sortDirection ?? DEFAULT_SORT_DIRECTION,
      filterField: query?.filterField,
      filterValue: query?.filterValue,
      filterOperator: query?.filterOperator,
    },
    headers: await headers(),
  });

  // Handle both possible response formats
  if ("users" in result && Array.isArray(result.users)) {
    return {
      users: result.users,
      total: result.total,

      limit:
        "limit" in result
          ? (result.limit ?? query?.limit ?? ADMIN_USER_LIST_LIMIT)
          : (query?.limit ?? ADMIN_USER_LIST_LIMIT),
      offset:
        "offset" in result
          ? (result.offset ?? query?.offset ?? 0)
          : (query?.offset ?? 0),
    };
  }

  // Empty result case
  return {
    users: [],
    total: 0,
    limit: query?.limit ?? ADMIN_USER_LIST_LIMIT,
    offset: query?.offset ?? 0,
  };
}
