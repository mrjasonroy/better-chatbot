import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { USER_ROLES } from "app-types/roles";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock the auth modules
vi.mock("auth/server", () => ({
  getSession: vi.fn(),
}));

vi.mock("./admin/server", () => ({
  requireAdminSession: vi.fn(),
}));

// Import after mocks
import {
  validatedAction,
  validatedActionWithUser,
  validatedActionWithAdminAccessCheck,
  validatedActionWithUserOrAdminAccessCheck,
} from "./action-utils";

const { getSession } = await import("auth/server");
const { requireAdminSession } = await import("./admin/server");

describe("action-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validatedAction", () => {
    it("should validate form data and call action with valid data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.string().transform(Number),
      });

      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedAction(schema, mockAction);

      const formData = new FormData();
      formData.set("name", "John");
      formData.set("age", "25");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { name: "John", age: 25 },
        formData,
      );
      expect(result).toEqual({ success: true });
    });

    it("should return error when validation fails", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const mockAction = vi.fn();
      const wrappedAction = validatedAction(schema, mockAction);

      const formData = new FormData();
      formData.set("email", "invalid-email");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toHaveProperty("error");
      expect((result as any).error).toContain("Invalid email");
    });
  });

  describe("validatedActionWithUser", () => {
    it("should call action with user when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        role: USER_ROLES.USER,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {} as any,
      } as any);

      const schema = z.object({ data: z.string() });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUser(schema, mockAction);

      const formData = new FormData();
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { data: "test" },
        formData,
        mockUser,
      );
      expect(result).toEqual({ success: true });
    });

    it("should return error when user is not authenticated", async () => {
      vi.mocked(getSession).mockRejectedValue(new Error("Unauthorized"));

      const schema = z.object({ data: z.string() });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithUser(schema, mockAction);

      const formData = new FormData();
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "User is not authenticated",
      });
    });
  });

  describe("validatedActionWithAdminAccessCheck", () => {
    it("should call action when user is admin", async () => {
      const mockAdminUser = {
        id: "admin-1",
        name: "Admin User",
        email: "admin@example.com",
        role: USER_ROLES.ADMIN,
      };

      vi.mocked(requireAdminSession).mockResolvedValue({
        user: mockAdminUser,
        session: {} as any,
      } as any);

      const schema = z.object({ action: z.string() });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("action", "delete");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { action: "delete" },
        formData,
        mockAdminUser,
      );
      expect(result).toEqual({ success: true });
    });

    it("should return error when user is not admin", async () => {
      vi.mocked(requireAdminSession).mockRejectedValue(new Error("Not admin"));

      const schema = z.object({ action: z.string() });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("action", "delete");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "You are not authorized to perform this action",
      });
    });

    it("should return validation error for invalid data", async () => {
      const mockAdminUser = {
        id: "admin-1",
        name: "Admin User",
        email: "admin@example.com",
        role: USER_ROLES.ADMIN,
      };

      vi.mocked(requireAdminSession).mockResolvedValue({
        user: mockAdminUser,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().uuid("Invalid user ID format"),
      });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("userId", "not-a-uuid");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "Invalid user ID format",
      });
    });
  });

  describe("validatedActionWithUserOrAdminAccessCheck", () => {
    it("should allow admin to act on any user", async () => {
      const mockAdminUser = {
        id: "admin-1",
        name: "Admin User",
        email: "admin@example.com",
        role: USER_ROLES.ADMIN,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockAdminUser,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("userId", "other-user-id");
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { userId: "other-user-id", data: "test" },
        formData,
        "other-user-id",
        true, // isAdmin
      );
      expect(result).toEqual({ success: true });
    });

    it("should allow regular user to act on themselves when userId matches", async () => {
      const mockUser = {
        id: "user-1",
        name: "Regular User",
        email: "user@example.com",
        role: USER_ROLES.USER,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("userId", "user-1"); // Same as logged-in user
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { userId: "user-1", data: "test" },
        formData,
        "user-1",
        false, // not admin
      );
      expect(result).toEqual({ success: true });
    });

    it("should allow regular user to act on themselves when userId is omitted", async () => {
      const mockUser = {
        id: "user-1",
        name: "Regular User",
        email: "user@example.com",
        role: USER_ROLES.USER,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      // userId not set, should default to current user
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { data: "test" }, // userId is undefined in data
        formData,
        "user-1", // defaults to current user's ID
        false, // not admin
      );
      expect(result).toEqual({ success: true });
    });

    it("should deny regular user acting on different user", async () => {
      const mockUser = {
        id: "user-1",
        name: "Regular User",
        email: "user@example.com",
        role: USER_ROLES.USER,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("userId", "other-user-id"); // Different from logged-in user
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "You are not authorized to perform this action",
      });
    });

    it("should return error when user is not authenticated", async () => {
      vi.mocked(getSession).mockRejectedValue(new Error("Unauthorized"));

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn();
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: "User is not authenticated",
      });
    });

    it("should handle editor role correctly", async () => {
      const mockEditor = {
        id: "editor-1",
        name: "Editor User",
        email: "editor@example.com",
        role: USER_ROLES.EDITOR,
      };

      vi.mocked(getSession).mockResolvedValue({
        user: mockEditor,
        session: {} as any,
      } as any);

      const schema = z.object({
        userId: z.string().optional(),
        data: z.string(),
      });
      const mockAction = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = validatedActionWithUserOrAdminAccessCheck(
        schema,
        mockAction,
      );

      const formData = new FormData();
      // Editor acting on themselves
      formData.set("userId", "editor-1");
      formData.set("data", "test");

      const result = await wrappedAction({}, formData);

      expect(mockAction).toHaveBeenCalledWith(
        { userId: "editor-1", data: "test" },
        formData,
        "editor-1",
        false, // Editor is not admin
      );
      expect(result).toEqual({ success: true });
    });
  });
});
