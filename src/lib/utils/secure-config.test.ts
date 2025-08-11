import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  substituteEnvVars,
  sanitizeSensitiveData,
  sanitizeMcpConfig,
  processMcpConfigForStorage,
  processMcpConfigForResponse,
} from "./secure-config";
import type { MCPServerConfig } from "app-types/mcp";

describe("secure-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set test environment variables
    process.env.TEST_TOKEN = "test-token-value";
    process.env.API_URL = "https://api.example.com";
    process.env.PORT = "3000";
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("substituteEnvVars", () => {
    it("should substitute environment variables with ${VAR} syntax", () => {
      const input = {
        url: "${API_URL}",
        headers: {
          Authorization: "Bearer ${TEST_TOKEN}",
        },
      };

      const result = substituteEnvVars(input);

      expect(result).toEqual({
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer test-token-value",
        },
      });
    });

    it("should substitute environment variables with $VAR syntax", () => {
      const input = {
        url: "$API_URL",
        port: "$PORT",
      };

      const result = substituteEnvVars(input);

      expect(result).toEqual({
        url: "https://api.example.com",
        port: "3000",
      });
    });

    it("should handle arrays", () => {
      const input = {
        servers: ["$API_URL", "${TEST_TOKEN}"],
      };

      const result = substituteEnvVars(input);

      expect(result).toEqual({
        servers: ["https://api.example.com", "test-token-value"],
      });
    });

    it("should leave non-existent variables unchanged", () => {
      const input = {
        url: "${NON_EXISTENT_VAR}",
        other: "$ALSO_NON_EXISTENT",
      };

      const result = substituteEnvVars(input);

      expect(result).toEqual({
        url: "${NON_EXISTENT_VAR}",
        other: "$ALSO_NON_EXISTENT",
      });
    });

    it("should handle nested objects", () => {
      const input = {
        config: {
          auth: {
            token: "${TEST_TOKEN}",
          },
        },
      };

      const result = substituteEnvVars(input);

      expect(result).toEqual({
        config: {
          auth: {
            token: "test-token-value",
          },
        },
      });
    });
  });

  describe("sanitizeSensitiveData", () => {
    it("should hide sensitive fields", () => {
      const input = {
        username: "testuser",
        password: "secret123",
        token: "abc123",
        apiKey: "xyz789",
        normalField: "visible",
      };

      const result = sanitizeSensitiveData(input);

      expect(result).toEqual({
        username: "testuser",
        password: "[HIDDEN]",
        token: "[HIDDEN]",
        apiKey: "[HIDDEN]",
        normalField: "visible",
      });
    });

    it("should handle nested objects", () => {
      const input = {
        config: {
          auth: {
            access_token: "token123",
            refresh_token: "refresh456",
          },
          settings: {
            visible: "data",
          },
        },
      };

      const result = sanitizeSensitiveData(input);

      expect(result).toEqual({
        config: {
          auth: {
            access_token: "[HIDDEN]",
            refresh_token: "[HIDDEN]",
          },
          settings: {
            visible: "data",
          },
        },
      });
    });

    it("should handle arrays", () => {
      const input = {
        items: [
          { token: "secret1", name: "item1" },
          { token: "secret2", name: "item2" },
        ],
      };

      const result = sanitizeSensitiveData(input);

      expect(result).toEqual({
        items: [
          { token: "[HIDDEN]", name: "item1" },
          { token: "[HIDDEN]", name: "item2" },
        ],
      });
    });

    it("should not hide empty strings", () => {
      const input = {
        token: "",
        password: "",
        normalField: "",
      };

      const result = sanitizeSensitiveData(input);

      expect(result).toEqual({
        token: "",
        password: "",
        normalField: "",
      });
    });

    it("should handle case-insensitive matching", () => {
      const input = {
        TOKEN: "secret1",
        Password: "secret2",
        API_KEY: "secret3",
      };

      const result = sanitizeSensitiveData(input);

      expect(result).toEqual({
        TOKEN: "[HIDDEN]",
        Password: "[HIDDEN]",
        API_KEY: "[HIDDEN]",
      });
    });
  });

  describe("sanitizeMcpConfig", () => {
    it("should sanitize MCP remote config", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer secret-token",
          "X-API-Key": "api-key-123",
          "Content-Type": "application/json",
        },
      };

      const result = sanitizeMcpConfig(config);

      expect(result).toEqual({
        url: "https://api.example.com",
        headers: {
          Authorization: "[HIDDEN]",
          "X-API-Key": "[HIDDEN]",
          "Content-Type": "application/json",
        },
      });
    });

    it("should sanitize MCP stdio config", () => {
      const config: MCPServerConfig = {
        command: "python",
        args: ["script.py"],
        env: {
          API_TOKEN: "secret-token",
          API_URL: "https://api.example.com",
          DEBUG: "true",
        },
      };

      const result = sanitizeMcpConfig(config);

      expect(result).toEqual({
        command: "python",
        args: ["script.py"],
        env: {
          API_TOKEN: "[HIDDEN]",
          API_URL: "https://api.example.com",
          DEBUG: "true",
        },
      });
    });
  });

  describe("processMcpConfigForStorage", () => {
    it("should substitute environment variables", () => {
      const config: MCPServerConfig = {
        url: "${API_URL}",
        headers: {
          Authorization: "Bearer ${TEST_TOKEN}",
        },
      };

      const result = processMcpConfigForStorage(config);

      expect(result).toEqual({
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer test-token-value",
        },
      });
    });
  });

  describe("processMcpConfigForResponse", () => {
    it("should sanitize sensitive data", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
      };

      const result = processMcpConfigForResponse(config);

      expect(result).toEqual({
        url: "https://api.example.com",
        headers: {
          Authorization: "[HIDDEN]",
          "Content-Type": "application/json",
        },
      });
    });
  });
});
