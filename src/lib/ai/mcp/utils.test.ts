import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  generateDeterministicUUID,
  substituteEnvVars,
  substituteEnvVarsInObject,
} from "./utils";

// Mock the mcpRepository module
vi.mock("lib/db/repository", () => ({
  mcpRepository: {
    selectAll: vi.fn(),
    save: vi.fn(),
    deleteById: vi.fn(),
  },
}));

// Import after mocking
const { syncFileBasedServersToDatabase } = await import("./utils");

describe("MCP Utils", () => {
  describe("generateDeterministicUUID", () => {
    it("should generate a valid UUID v4 format", () => {
      const uuid = generateDeterministicUUID({ test: "data" });
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("should generate the same UUID for the same input", () => {
      const data = { name: "test", config: { url: "https://example.com" } };
      const uuid1 = generateDeterministicUUID(data);
      const uuid2 = generateDeterministicUUID(data);
      expect(uuid1).toBe(uuid2);
    });

    it("should generate different UUIDs for different inputs", () => {
      const uuid1 = generateDeterministicUUID({ name: "test1" });
      const uuid2 = generateDeterministicUUID({ name: "test2" });
      expect(uuid1).not.toBe(uuid2);
    });

    it("should handle complex nested objects", () => {
      const data = {
        name: "complex",
        config: {
          url: "https://api.example.com",
          headers: {
            Authorization: "Bearer token",
            "Content-Type": "application/json",
          },
          nested: {
            deep: {
              value: 123,
            },
          },
        },
      };
      const uuid = generateDeterministicUUID(data);
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("should generate different UUIDs when object properties change", () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { a: 1, b: 3 };
      expect(generateDeterministicUUID(data1)).not.toBe(
        generateDeterministicUUID(data2),
      );
    });

    it("should generate same UUID regardless of property order", () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 };
      expect(generateDeterministicUUID(data1)).toBe(
        generateDeterministicUUID(data2),
      );
    });
  });

  describe("substituteEnvVars", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.TEST_VAR = "test_value";
      process.env.API_KEY = "secret123";
      process.env.NUMBER_VAR = "42";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should substitute ${VAR} format", () => {
      const result = substituteEnvVars("Value: ${TEST_VAR}");
      expect(result).toBe("Value: test_value");
    });

    it("should substitute $VAR format", () => {
      const result = substituteEnvVars("Value: $TEST_VAR");
      expect(result).toBe("Value: test_value");
    });

    it("should handle multiple substitutions", () => {
      const result = substituteEnvVars("${TEST_VAR} and ${API_KEY}");
      expect(result).toBe("test_value and secret123");
    });

    it("should preserve non-existent variables", () => {
      const result = substituteEnvVars("${NON_EXISTENT_VAR}");
      expect(result).toBe("${NON_EXISTENT_VAR}");
    });

    it("should handle mixed formats", () => {
      const result = substituteEnvVars("${TEST_VAR} $API_KEY ${NUMBER_VAR}");
      expect(result).toBe("test_value secret123 42");
    });

    it("should not substitute invalid variable names", () => {
      const result = substituteEnvVars("$123invalid ${kebab-case}");
      expect(result).toBe("$123invalid ${kebab-case}");
    });

    it("should handle empty string", () => {
      const result = substituteEnvVars("");
      expect(result).toBe("");
    });

    it("should handle string without variables", () => {
      const result = substituteEnvVars("No variables here");
      expect(result).toBe("No variables here");
    });
  });

  describe("substituteEnvVarsInObject", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.TEST_VAR = "test_value";
      process.env.API_KEY = "secret123";
      process.env.PORT = "3000";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should substitute in simple object", () => {
      const obj = {
        key: "${TEST_VAR}",
        another: "static",
      };
      const result = substituteEnvVarsInObject(obj);
      expect(result).toEqual({
        key: "test_value",
        another: "static",
      });
    });

    it("should substitute in nested objects", () => {
      const obj = {
        level1: {
          level2: {
            value: "${API_KEY}",
          },
        },
      };
      const result = substituteEnvVarsInObject(obj);
      expect(result).toEqual({
        level1: {
          level2: {
            value: "secret123",
          },
        },
      });
    });

    it("should substitute in arrays", () => {
      const obj = {
        items: ["${TEST_VAR}", "static", "${API_KEY}"],
      };
      const result = substituteEnvVarsInObject(obj);
      expect(result).toEqual({
        items: ["test_value", "static", "secret123"],
      });
    });

    it("should handle mixed nested structures", () => {
      const obj = {
        name: "test",
        config: {
          url: "http://localhost:${PORT}",
          headers: {
            Authorization: "Bearer ${API_KEY}",
          },
          args: ["--key", "${TEST_VAR}", "--port", "${PORT}"],
        },
      };
      const result = substituteEnvVarsInObject(obj);
      expect(result).toEqual({
        name: "test",
        config: {
          url: "http://localhost:3000",
          headers: {
            Authorization: "Bearer secret123",
          },
          args: ["--key", "test_value", "--port", "3000"],
        },
      });
    });

    it("should return non-object types unchanged", () => {
      expect(substituteEnvVarsInObject(123)).toBe(123);
      expect(substituteEnvVarsInObject(true)).toBe(true);
      expect(substituteEnvVarsInObject(null)).toBe(null);
      expect(substituteEnvVarsInObject(undefined)).toBe(undefined);
    });

    it("should handle empty objects and arrays", () => {
      expect(substituteEnvVarsInObject({})).toEqual({});
      expect(substituteEnvVarsInObject([])).toEqual([]);
    });

    it("should not mutate original object", () => {
      const original = { key: "${TEST_VAR}" };
      const result = substituteEnvVarsInObject(original);
      expect(original).toEqual({ key: "${TEST_VAR}" });
      expect(result).toEqual({ key: "test_value" });
    });
  });

  describe("checkAndRefreshMCPClients", () => {
    it("should refresh clients when configs change", async () => {
      const mockManager = {
        getClients: vi.fn().mockResolvedValue([
          {
            id: "server1",
            client: {
              getInfo: () => ({
                name: "Server 1",
                config: { url: "http://old.url" },
              }),
            },
          },
        ]),
        addClient: vi.fn().mockResolvedValue(undefined),
        removeClient: vi.fn().mockResolvedValue(undefined),
      };

      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      };

      const storageServers = [
        {
          id: "server1",
          name: "Server 1",
          config: { url: "http://new.url" }, // Changed URL
          isFileBased: false,
        },
      ];

      const { checkAndRefreshMCPClients } = await import("./utils");
      await checkAndRefreshMCPClients(
        storageServers,
        mockManager as any,
        mockLogger as any,
      );

      expect(mockManager.addClient).toHaveBeenCalledWith(
        "server1",
        "Server 1",
        { url: "http://new.url" },
        false,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Refreshing/adding MCP client Server 1 (server1)",
      );
    });

    it("should remove clients not in storage", async () => {
      const mockManager = {
        getClients: vi.fn().mockResolvedValue([
          {
            id: "server1",
            client: {
              getInfo: () => ({
                name: "Server 1",
                config: { url: "http://test.url" },
              }),
            },
          },
          {
            id: "server2",
            client: {
              getInfo: () => ({
                name: "Server 2",
                config: { url: "http://test2.url" },
              }),
            },
          },
        ]),
        removeClient: vi.fn().mockResolvedValue(undefined),
      };

      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      };

      const storageServers = [
        {
          id: "server1",
          name: "Server 1",
          config: { url: "http://test.url" },
          isFileBased: false,
        },
        // server2 is missing - should be removed
      ];

      const { checkAndRefreshMCPClients } = await import("./utils");
      await checkAndRefreshMCPClients(
        storageServers,
        mockManager as any,
        mockLogger as any,
      );

      expect(mockManager.removeClient).toHaveBeenCalledWith("server2");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Removing MCP client server2",
      );
    });

    it("should not make changes when configs are identical", async () => {
      const config = { url: "http://same.url" };
      const mockManager = {
        getClients: vi.fn().mockResolvedValue([
          {
            id: "server1",
            client: { getInfo: () => ({ name: "Server 1", config }) },
          },
        ]),
        addClient: vi.fn(),
        removeClient: vi.fn(),
      };

      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      };

      const storageServers = [
        {
          id: "server1",
          name: "Server 1",
          config, // Same config object
          isFileBased: false,
        },
      ];

      const { checkAndRefreshMCPClients } = await import("./utils");
      await checkAndRefreshMCPClients(
        storageServers,
        mockManager as any,
        mockLogger as any,
      );

      expect(mockManager.addClient).not.toHaveBeenCalled();
      expect(mockManager.removeClient).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Checking MCP clients diff",
      );
    });
  });

  describe("syncFileBasedServersToDatabase", () => {
    let mockLogger: any;
    let mockMcpRepository: any;

    beforeEach(async () => {
      // Get the mocked repository
      const { mcpRepository } = await import("lib/db/repository");
      mockMcpRepository = mcpRepository;

      // Reset mocks before each test
      vi.clearAllMocks();

      // Mock the logger
      mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      };
    });

    it("should sync new file-based servers to database", async () => {
      const fileBasedServers = [
        {
          id: "file-server-1",
          name: "File Server 1",
          config: { url: "http://file1.com" },
          enabled: true,
          isFileBased: true,
        },
        {
          id: "file-server-2",
          name: "File Server 2",
          config: { url: "http://file2.com" },
          enabled: true,
          isFileBased: true,
        },
      ];

      mockMcpRepository.selectAll.mockResolvedValue([]);
      mockMcpRepository.save.mockResolvedValue({});

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockMcpRepository.save).toHaveBeenCalledTimes(2);
      expect(mockMcpRepository.save).toHaveBeenCalledWith({
        id: "file-server-1",
        name: "File Server 1",
        config: { url: "http://file1.com" },
      });
      expect(mockMcpRepository.save).toHaveBeenCalledWith({
        id: "file-server-2",
        name: "File Server 2",
        config: { url: "http://file2.com" },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Synced file-based server 'File Server 1' to database",
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Synced file-based server 'File Server 2' to database",
      );
    });

    it("should update existing file-based servers in database", async () => {
      const fileBasedServers = [
        {
          id: "file-server-1",
          name: "Updated File Server",
          config: { url: "http://updated.com" },
          enabled: true,
          isFileBased: true,
        },
      ];

      const existingDbServers = [
        {
          id: "file-server-1",
          name: "Old File Server",
          config: { url: "http://old.com" },
          enabled: true,
        },
      ];

      mockMcpRepository.selectAll.mockResolvedValue(existingDbServers);
      mockMcpRepository.save.mockResolvedValue({});

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockMcpRepository.save).toHaveBeenCalledWith({
        id: "file-server-1",
        name: "Updated File Server",
        config: { url: "http://updated.com" },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Synced file-based server 'Updated File Server' to database",
      );
    });

    it("should remove stale file-based servers from database", async () => {
      const fileBasedServers = [
        {
          id: "file-server-1",
          name: "Active Server",
          config: { url: "http://active.com" },
          enabled: true,
          isFileBased: true,
        },
      ];

      // Create a server that should be removed (deterministic UUID matches)
      const serverToRemove = {
        id: "stale-server-id",
        name: "Stale Server",
        config: { url: "http://stale.com" },
        enabled: true,
      };

      // Generate expected deterministic UUID for the stale server
      const expectedStaleId = generateDeterministicUUID({
        name: "Stale Server",
        config: { url: "http://stale.com" },
      });
      serverToRemove.id = expectedStaleId;

      const existingDbServers = [
        {
          id: "file-server-1",
          name: "Active Server",
          config: { url: "http://active.com" },
          enabled: true,
        },
        serverToRemove, // This should be removed
        {
          id: "user-created-server",
          name: "User Server",
          config: { url: "http://user.com" },
          enabled: true,
        }, // This should be kept (not deterministic UUID)
      ];

      mockMcpRepository.selectAll.mockResolvedValue(existingDbServers);
      mockMcpRepository.save.mockResolvedValue({});
      mockMcpRepository.deleteById.mockResolvedValue(undefined);

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      // Should save the active server
      expect(mockMcpRepository.save).toHaveBeenCalledWith({
        id: "file-server-1",
        name: "Active Server",
        config: { url: "http://active.com" },
      });

      // Should remove the stale file-based server
      expect(mockMcpRepository.deleteById).toHaveBeenCalledWith(
        expectedStaleId,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Removed file-based server 'Stale Server' from database (no longer in config)",
      );

      // Should keep the user-created server (debug log)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Keeping user-created server 'User Server'",
      );
    });

    it("should handle empty file-based servers list", async () => {
      const fileBasedServers: any[] = [];

      mockMcpRepository.selectAll.mockResolvedValue([]);

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockMcpRepository.save).not.toHaveBeenCalled();
      expect(mockMcpRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should handle repository errors gracefully", async () => {
      const fileBasedServers = [
        {
          id: "error-server",
          name: "Error Server",
          config: { url: "http://error.com" },
          enabled: true,
          isFileBased: true,
        },
      ];

      mockMcpRepository.selectAll.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to sync file-based servers to database:",
        expect.any(Error),
      );
    });

    it("should handle individual server save errors", async () => {
      const fileBasedServers = [
        {
          id: "good-server",
          name: "Good Server",
          config: { url: "http://good.com" },
          enabled: true,
          isFileBased: true,
        },
        {
          id: "bad-server",
          name: "Bad Server",
          config: { url: "http://bad.com" },
          enabled: true,
          isFileBased: true,
        },
      ];

      mockMcpRepository.selectAll.mockResolvedValue([]);
      mockMcpRepository.save
        .mockResolvedValueOnce({}) // First save succeeds
        .mockRejectedValueOnce(new Error("Save failed")); // Second save fails

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Synced file-based server 'Good Server' to database",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to sync server 'Bad Server' to database:",
        expect.any(Error),
      );
    });

    it("should handle delete errors gracefully", async () => {
      const fileBasedServers: any[] = [];

      const staleServer = {
        id: generateDeterministicUUID({
          name: "Stale Server",
          config: { url: "http://stale.com" },
        }),
        name: "Stale Server",
        config: { url: "http://stale.com" },
        enabled: true,
      };

      mockMcpRepository.selectAll.mockResolvedValue([staleServer]);
      mockMcpRepository.deleteById.mockRejectedValue(
        new Error("Delete failed"),
      );

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to remove server 'Stale Server' from database:",
        expect.any(Error),
      );
    });

    it("should preserve user-created servers with non-deterministic UUIDs", async () => {
      const fileBasedServers: any[] = [];

      const userCreatedServers = [
        {
          id: "random-uuid-1234-5678", // Non-deterministic UUID
          name: "User Server 1",
          config: { url: "http://user1.com" },
          enabled: true,
        },
        {
          id: "another-random-uuid", // Non-deterministic UUID
          name: "User Server 2",
          config: { url: "http://user2.com" },
          enabled: true,
        },
      ];

      mockMcpRepository.selectAll.mockResolvedValue(userCreatedServers);

      await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

      // Should not delete any servers (they're not deterministic UUIDs)
      expect(mockMcpRepository.deleteById).not.toHaveBeenCalled();

      // Should log that we're keeping them
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Keeping user-created server 'User Server 1'",
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Keeping user-created server 'User Server 2'",
      );
    });
  });
});
