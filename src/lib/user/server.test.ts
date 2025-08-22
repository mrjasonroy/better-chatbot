//@vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock dependencies
vi.mock("lib/db/repository", () => ({
  userRepository: {
    getUserById: vi.fn(),
    getUserStats: vi.fn(),
    getPreferences: vi.fn(),
  },
}));

vi.mock("auth/server", () => ({
  auth: {
    api: {
      listUserAccounts: vi.fn(),
      listSessions: vi.fn(),
    },
  },
  getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

const { auth, getSession } = await import("auth/server");
const { headers } = await import("next/headers");
const { notFound } = await import("next/navigation");
import { getUserAccounts, getUserIdAndCheckAccess } from "./server";

/*
 * Tests focus on the business logic of the user server.
 */
describe("User Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserAccounts - Account Type Detection", () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "user-1" },
      } as any);
      vi.mocked(headers).mockResolvedValue(new Headers());
    });

    it("should correctly identify password vs OAuth accounts", async () => {
      const mockAccounts = [
        { provider: "credential", id: "1" },
        { provider: "google", id: "2" },
        { provider: "github", id: "3" },
      ];
      vi.mocked(auth.api.listUserAccounts).mockResolvedValue(
        mockAccounts as any,
      );

      const result = await getUserAccounts("user-1");

      expect(result.hasPassword).toBe(true);
      expect(result.oauthProviders).toEqual(["google", "github"]);
    });

    it("should handle OAuth-only accounts", async () => {
      const mockAccounts = [
        { provider: "google", id: "1" },
        { provider: "github", id: "2" },
      ];
      vi.mocked(auth.api.listUserAccounts).mockResolvedValue(
        mockAccounts as any,
      );

      const result = await getUserAccounts("user-1");

      expect(result.hasPassword).toBe(false);
      expect(result.oauthProviders).toEqual(["google", "github"]);
    });

    it("should handle password-only accounts", async () => {
      const mockAccounts = [{ provider: "credential", id: "1" }];
      vi.mocked(auth.api.listUserAccounts).mockResolvedValue(
        mockAccounts as any,
      );

      const result = await getUserAccounts("user-1");

      expect(result.hasPassword).toBe(true);
      expect(result.oauthProviders).toEqual([]);
    });

    it("should filter out credential provider from OAuth list", async () => {
      const mockAccounts = [
        { provider: "credential", id: "1" },
        { provider: "credential", id: "2" }, // multiple credential accounts
        { provider: "google", id: "3" },
      ];
      vi.mocked(auth.api.listUserAccounts).mockResolvedValue(
        mockAccounts as any,
      );

      const result = await getUserAccounts("user-1");

      expect(result.hasPassword).toBe(true);
      expect(result.oauthProviders).toEqual(["google"]); // credential filtered out
    });
  });

  describe("getUserIdAndCheckAccess - Access Control Logic", () => {
    it("should use requested user ID when provided", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "current-user" },
      } as any);

      const result = await getUserIdAndCheckAccess("target-user");

      expect(result).toBe("target-user");
    });

    it("should fall back to current user ID when none provided", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "current-user" },
      } as any);

      const result = await getUserIdAndCheckAccess();

      expect(result).toBe("current-user");
    });

    it("should call notFound for falsy user IDs", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: { id: "" } } as any);

      await getUserIdAndCheckAccess();

      expect(notFound).toHaveBeenCalled();
    });

    it("should handle null/undefined gracefully", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "fallback-user" },
      } as any);

      const result1 = await getUserIdAndCheckAccess(null as any);
      const result2 = await getUserIdAndCheckAccess(undefined);

      expect(result1).toBe("fallback-user");
      expect(result2).toBe("fallback-user");
    });
  });
});
