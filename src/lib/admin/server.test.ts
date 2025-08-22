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

describe("Admin Server - Business Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdminSession - Admin Role Detection", () => {
    it("should detect admin role case-insensitively", async () => {
      const testCases = [
        { role: "admin", shouldPass: true },
        { role: "ADMIN", shouldPass: true },
        { role: "Admin", shouldPass: true },
        { role: "user,admin", shouldPass: true },
        { role: "ADMIN,editor", shouldPass: true },
        { role: "user", shouldPass: false },
        { role: "editor", shouldPass: false },
        { role: "USER,EDITOR", shouldPass: false },
        { role: "", shouldPass: false },
        { role: null, shouldPass: false },
        { role: undefined, shouldPass: false },
      ];

      for (const testCase of testCases) {
        const mockSession = {
          user: { id: "test-user", role: testCase.role },
          session: { id: "session-1" },
        };

        vi.mocked(getSession).mockResolvedValue(mockSession as any);

        if (testCase.shouldPass) {
          const result = await requireAdminSession();
          expect(result).toEqual(mockSession);
        } else {
          await expect(requireAdminSession()).rejects.toThrow(
            "Unauthorized: Admin access required",
          );
        }
      }
    });
  });

  describe("getAdminUsers - Query Parameter Handling", () => {
    beforeEach(() => {
      // Mock admin session by default
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "admin-1", role: USER_ROLES.ADMIN },
      } as any);
    });

    it("should apply correct defaults when no query provided", async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
        total: 0,
      } as any);

      await getAdminUsers();

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: {
          searchValue: undefined,
          searchField: undefined,
          searchOperator: undefined,
          limit: ADMIN_USER_LIST_LIMIT, // default
          offset: 0, // default
          sortBy: DEFAULT_SORT_BY, // default
          sortDirection: DEFAULT_SORT_DIRECTION, // default
          filterField: undefined,
          filterValue: undefined,
          filterOperator: undefined,
        },
        headers: expect.any(Headers),
      });
    });

    it("should override defaults with provided query parameters", async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
        total: 0,
      } as any);

      const customQuery = {
        limit: 25,
        offset: 50,
        sortBy: "name" as const,
        sortDirection: "asc" as const,
        searchValue: "john",
        searchField: "email" as const,
      };

      await getAdminUsers(customQuery);

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: expect.objectContaining({
          limit: 25,
          offset: 50,
          sortBy: "name",
          sortDirection: "asc",
          searchValue: "john",
          searchField: "email",
        }),
        headers: expect.any(Headers),
      });
    });

    it("should handle response format variations", async () => {
      // Test case 1: Response with limit/offset fields
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [{ id: "1" }],
        total: 1,
        limit: 5,
        offset: 10,
      } as any);

      const result1 = await getAdminUsers({ limit: 20, offset: 30 });

      expect(result1).toEqual({
        users: [{ id: "1" }],
        total: 1,
        limit: 5, // from response
        offset: 10, // from response
      });

      // Test case 2: Response without limit/offset fields
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [{ id: "2" }],
        total: 1,
        // no limit/offset in response
      } as any);

      const result2 = await getAdminUsers({ limit: 20, offset: 30 });

      expect(result2).toEqual({
        users: [{ id: "2" }],
        total: 1,
        limit: 20, // from query
        offset: 30, // from query
      });
    });

    it("should handle edge case responses", async () => {
      // Test malformed/missing response
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        // no users array
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

    it("should enforce admin access before making API call", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "user-1", role: USER_ROLES.USER },
      } as any);

      await expect(getAdminUsers()).rejects.toThrow(
        "Unauthorized: Admin access required",
      );

      // Should not make the API call if not admin
      expect(auth.api.listUsers).not.toHaveBeenCalled();
    });
  });

  describe("Constants", () => {
    it("should have correct default values", () => {
      expect(ADMIN_USER_LIST_LIMIT).toBe(10);
      expect(DEFAULT_SORT_BY).toBe("createdAt");
      expect(DEFAULT_SORT_DIRECTION).toBe("desc");
    });
  });
});
