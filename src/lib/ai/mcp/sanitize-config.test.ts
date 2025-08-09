import { describe, expect, it } from "vitest";
import { sanitizeMcpConfig } from "./sanitize-config";
import type { MCPServerConfig } from "app-types/mcp";

describe("sanitizeMcpConfig", () => {
  describe("Remote server configs", () => {
    it("should sanitize sensitive headers", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer secret-token",
          "X-API-Key": "api-key-123",
          "X-Secret-Token": "secret-value",
          "Content-Type": "application/json",
          "User-Agent": "MyApp/1.0",
        },
      };

      const sanitized = sanitizeMcpConfig(config);

      expect(sanitized).toEqual({
        url: "https://api.example.com",
        headers: {
          Authorization: "***HIDDEN***",
          "X-API-Key": "***HIDDEN***",
          "X-Secret-Token": "***HIDDEN***",
          "Content-Type": "application/json", // Not sensitive
          "User-Agent": "MyApp/1.0", // Not sensitive
        },
      });
    });

    it("should preserve config when no sensitive headers exist", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "MyApp/1.0",
        },
      };

      const sanitized = sanitizeMcpConfig(config);
      expect(sanitized).toEqual(config);
    });
  });

  describe("Stdio server configs", () => {
    it("should sanitize sensitive environment variables", () => {
      const config: MCPServerConfig = {
        command: "node",
        args: ["server.js"],
        env: {
          API_KEY: "secret-key",
          DATABASE_PASSWORD: "secret-password",
          AUTH_TOKEN: "secret-token",
          NODE_ENV: "production", // Not sensitive
          PORT: "3000", // Not sensitive
        },
      };

      const sanitized = sanitizeMcpConfig(config);

      expect(sanitized).toEqual({
        command: "node",
        args: ["server.js"],
        env: {
          API_KEY: "***HIDDEN***",
          DATABASE_PASSWORD: "***HIDDEN***",
          AUTH_TOKEN: "***HIDDEN***",
          NODE_ENV: "production",
          PORT: "3000",
        },
      });
    });

    it("should sanitize authorization in args array", () => {
      const config: MCPServerConfig = {
        command: "npx",
        args: [
          "-y",
          "mcp-remote",
          "http://example.com/mcp",
          "--header",
          "authorization:Bearer secret-token",
          "--header",
          "content-type:application/json",
          "--api-key",
          "secret-key-123",
          "--timeout",
          "30000",
        ],
      };

      const sanitized = sanitizeMcpConfig(config);

      expect(sanitized).toEqual({
        command: "npx",
        args: [
          "-y",
          "mcp-remote",
          "http://example.com/mcp",
          "--header",
          "authorization:***HIDDEN***",
          "--header",
          "content-type:application/json", // Not sensitive
          "--api-key",
          "***HIDDEN***", // Value after --api-key is hidden
          "--timeout",
          "30000", // Not sensitive
        ],
      });
    });

    it("should handle args with no sensitive data", () => {
      const config: MCPServerConfig = {
        command: "node",
        args: ["server.js", "--port", "3000", "--env", "production"],
      };

      const sanitized = sanitizeMcpConfig(config);
      expect(sanitized).toEqual(config);
    });

    it("should handle mixed sensitive patterns in args", () => {
      const config: MCPServerConfig = {
        command: "cli-tool",
        args: [
          "--database-password",
          "secret123",
          "--host",
          "localhost",
          "secret-token:abc123",
          "--verbose",
        ],
      };

      const sanitized = sanitizeMcpConfig(config);

      expect(sanitized).toEqual({
        command: "cli-tool",
        args: [
          "--database-password",
          "***HIDDEN***",
          "--host",
          "localhost",
          "secret-token:***HIDDEN***",
          "--verbose",
        ],
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle config with no headers or env", () => {
      const remoteConfig: MCPServerConfig = {
        url: "https://api.example.com",
      };

      const stdioConfig: MCPServerConfig = {
        command: "node",
        args: ["server.js"],
      };

      expect(sanitizeMcpConfig(remoteConfig)).toEqual(remoteConfig);
      expect(sanitizeMcpConfig(stdioConfig)).toEqual(stdioConfig);
    });

    it("should not mutate the original config", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          Authorization: "Bearer secret-token",
        },
      };

      const originalHeaders = { ...config.headers };
      const sanitized = sanitizeMcpConfig(config);

      // Original should be unchanged
      expect(config.headers).toEqual(originalHeaders);
      // Sanitized should be different
      expect((sanitized as any).headers["Authorization"]).toBe("***HIDDEN***");
    });

    it("should handle empty args array", () => {
      const config: MCPServerConfig = {
        command: "node",
        args: [],
      };

      const sanitized = sanitizeMcpConfig(config);
      expect(sanitized).toEqual(config);
    });

    it("should handle args with colon but no sensitive key", () => {
      const config: MCPServerConfig = {
        command: "tool",
        args: ["--config", "host:port", "database:name"],
      };

      const sanitized = sanitizeMcpConfig(config);
      expect(sanitized).toEqual(config);
    });
  });

  describe("Case insensitive matching", () => {
    it("should detect sensitive patterns regardless of case", () => {
      const config: MCPServerConfig = {
        url: "https://api.example.com",
        headers: {
          AUTHORIZATION: "Bearer token",
          "x-api-KEY": "key123",
          "X-Secret": "secret",
          "content-TYPE": "application/json",
        },
      };

      const sanitized = sanitizeMcpConfig(config);

      expect((sanitized as any).headers).toEqual({
        AUTHORIZATION: "***HIDDEN***",
        "x-api-KEY": "***HIDDEN***",
        "X-Secret": "***HIDDEN***",
        "content-TYPE": "application/json",
      });
    });
  });
});
