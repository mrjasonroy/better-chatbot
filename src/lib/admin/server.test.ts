import { describe, it, expect, vi, beforeEach } from "vitest";
import { USER_ROLES } from "app-types/roles";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock the auth module
vi.mock("lib/auth/server", () => ({
  auth: {
    api: {
      listUsers: vi.fn(),
    },
  },
  getSession: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Import after mocks
import {
  requireAdminSession,
  getAdminUsers,
  ADMIN_USER_LIST_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
} from "./server";
import { auth, getSession } from "lib/auth/server";

describe("admin/server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdminSession", () => {
    it("should return session when user is admin", async () => {
      const mockAdminSession = {
        user: {
          id: "admin-1",
          name: "Admin User",
          email: "admin@example.com",
          role: USER_ROLES.ADMIN,
        },
        session: {
          id: "session-1",
          token: "token-123",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);

      const result = await requireAdminSession();

      expect(result).toEqual(mockAdminSession);
      expect(getSession).toHaveBeenCalledOnce();
    });

    it("should throw error when user is not admin", async () => {
      const mockUserSession = {
        user: {
          id: "user-1",
          name: "Regular User",
          email: "user@example.com",
          role: USER_ROLES.USER,
        },
        session: {
          id: "session-1",
          token: "token-123",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);

      await expect(requireAdminSession()).rejects.toThrow(
        "Unauthorized: Admin access required",
      );
    });

    it("should throw error when user is editor", async () => {
      const mockEditorSession = {
        user: {
          id: "editor-1",
          name: "Editor User",
          email: "editor@example.com",
          role: USER_ROLES.EDITOR,
        },
        session: {
          id: "session-1",
          token: "token-123",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockEditorSession as any);

      await expect(requireAdminSession()).rejects.toThrow(
        "Unauthorized: Admin access required",
      );
    });

    it("should handle case-insensitive admin role check", async () => {
      const mockAdminSession = {
        user: {
          id: "admin-1",
          name: "Admin User",
          email: "admin@example.com",
          role: "ADMIN", // Uppercase
        },
        session: {
          id: "session-1",
          token: "token-123",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);

      const result = await requireAdminSession();

      expect(result).toEqual(mockAdminSession);
    });

    it("should throw error when session is null", async () => {
      vi.mocked(getSession).mockResolvedValue(null as any);

      await expect(requireAdminSession()).rejects.toThrow();
    });

    it("should throw error when user has no role", async () => {
      const mockSessionNoRole = {
        user: {
          id: "user-1",
          name: "User",
          email: "user@example.com",
          // No role field
        },
        session: {
          id: "session-1",
          token: "token-123",
        },
      };

      vi.mocked(getSession).mockResolvedValue(mockSessionNoRole as any);

      await expect(requireAdminSession()).rejects.toThrow(
        "Unauthorized: Admin access required",
      );
    });
  });

  describe("getAdminUsers", () => {
    beforeEach(() => {
      // Mock requireAdminSession to succeed by default
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: "admin-1",
          role: USER_ROLES.ADMIN,
        },
      } as any);
    });

    it("should return paginated users with default parameters", async () => {
      const mockUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
        { id: "2", name: "User 2", email: "user2@test.com" },
      ];

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: mockUsers,
        total: 2,
        limit: ADMIN_USER_LIST_LIMIT,
        offset: 0,
      } as any);

      const result = await getAdminUsers();

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: {
          searchValue: undefined,
          searchField: undefined,
          searchOperator: undefined,
          limit: ADMIN_USER_LIST_LIMIT,
          offset: 0,
          sortBy: DEFAULT_SORT_BY,
          sortDirection: DEFAULT_SORT_DIRECTION,
          filterField: undefined,
          filterValue: undefined,
          filterOperator: undefined,
        },
        headers: expect.any(Headers),
      });

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
        limit: ADMIN_USER_LIST_LIMIT,
        offset: 0,
      });
    });

    it("should pass custom query parameters", async () => {
      const mockUsers = [{ id: "1", name: "John", email: "john@test.com" }];

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: mockUsers,
        total: 1,
        limit: 5,
        offset: 10,
      } as any);

      const query = {
        searchValue: "john",
        searchField: "name" as const,
        searchOperator: "contains" as const,
        limit: 5,
        offset: 10,
        sortBy: "name" as const,
        sortDirection: "asc" as const,
        filterField: "role" as const,
        filterValue: "admin",
        filterOperator: "eq" as const,
      };

      const result = await getAdminUsers(query);

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: {
          searchValue: "john",
          searchField: "name",
          searchOperator: "contains",
          limit: 5,
          offset: 10,
          sortBy: "name",
          sortDirection: "asc",
          filterField: "role",
          filterValue: "admin",
          filterOperator: "eq",
        },
        headers: expect.any(Headers),
      });

      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        limit: 5,
        offset: 10,
      });
    });

    it("should handle empty result", async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
        total: 0,
      } as any);

      const result = await getAdminUsers();

      expect(result).toEqual({
        users: [],
        total: 0,
        limit: ADMIN_USER_LIST_LIMIT,
        offset: 0,
      });
    });

    it("should handle result without limit/offset fields", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: mockUsers,
        total: 1,
        // No limit or offset fields
      } as any);

      const result = await getAdminUsers({ limit: 20, offset: 5 });

      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        limit: 20,
        offset: 5,
      });
    });

    it("should throw error when user is not admin", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: "user-1",
          role: USER_ROLES.USER,
        },
      } as any);

      await expect(getAdminUsers()).rejects.toThrow(
        "Unauthorized: Admin access required",
      );

      expect(auth.api.listUsers).not.toHaveBeenCalled();
    });

    it("should handle pagination correctly", async () => {
      const page1Users = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@test.com`,
      }));

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: page1Users,
        total: 25,
        limit: 10,
        offset: 0,
      } as any);

      const resultPage1 = await getAdminUsers({ limit: 10, offset: 0 });

      expect(resultPage1).toEqual({
        users: page1Users,
        total: 25,
        limit: 10,
        offset: 0,
      });

      // Test page 2
      const page2Users = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i + 11}`,
        name: `User ${i + 11}`,
        email: `user${i + 11}@test.com`,
      }));

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: page2Users,
        total: 25,
        limit: 10,
        offset: 10,
      } as any);

      const resultPage2 = await getAdminUsers({ limit: 10, offset: 10 });

      expect(resultPage2).toEqual({
        users: page2Users,
        total: 25,
        limit: 10,
        offset: 10,
      });
    });

    it("should handle search with filters", async () => {
      const filteredUsers = [
        { id: "1", name: "Admin John", email: "john@admin.com", role: "admin" },
      ];

      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: filteredUsers,
        total: 1,
        limit: 10,
        offset: 0,
      } as any);

      const result = await getAdminUsers({
        searchValue: "john",
        searchField: "name",
        filterField: "role",
        filterValue: "admin",
        filterOperator: "eq",
      });

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: expect.objectContaining({
          searchValue: "john",
          searchField: "name",
          filterField: "role",
          filterValue: "admin",
          filterOperator: "eq",
        }),
        headers: expect.any(Headers),
      });

      expect(result.users).toEqual(filteredUsers);
      expect(result.total).toBe(1);
    });
  });
});
