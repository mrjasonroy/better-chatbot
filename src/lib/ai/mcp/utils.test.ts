import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  generateDeterministicUUID,
  substituteEnvVars,
  substituteEnvVarsInObject,
} from "./utils";

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
            client: { getInfo: () => ({ name: "Server 1", config: {} }) },
          },
          {
            id: "server2",
            client: { getInfo: () => ({ name: "Server 2", config: {} }) },
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
          config: {},
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
});
