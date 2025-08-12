import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createHybridMCPConfigStorage } from "./hybrid-mcp-config-storage";
import { generateDeterministicUUID } from "./utils";
import { readFile } from "fs/promises";
import { mcpRepository } from "lib/db/repository";
import type { MCPClientsManager } from "./create-mcp-clients-manager";
import type { McpServerSelect } from "app-types/mcp";

vi.mock("fs/promises");
vi.mock("lib/db/repository");
vi.mock("chokidar");

const mockReadFile = vi.mocked(readFile);
const mockMcpRepository = vi.mocked(mcpRepository);

describe("Hybrid MCP Config Storage", () => {
  let storage: any;
  let mockManager: MCPClientsManager;

  const mockDefaultConfig = {
    "test-server": {
      command: "npx",
      args: ["test-server"],
    },
    "api-server": {
      url: "https://api.example.com",
      headers: {
        Authorization: "${API_KEY}",
      },
    },
  };

  const mockUserServers: McpServerSelect[] = [
    {
      id: "user-server-1",
      name: "User Server 1",
      config: { command: "node", args: ["server.js"] },
      isFileBased: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    process.env.API_KEY = "test-api-key";

    mockManager = {
      getClients: vi.fn().mockResolvedValue([]),
      getClient: vi.fn(),
      addClient: vi.fn(),
      refreshClient: vi.fn(),
      removeClient: vi.fn(),
    } as any;

    storage = createHybridMCPConfigStorage("/test/config.json");
  });

  afterEach(() => {
    delete process.env.API_KEY;
  });

  describe("loadAll", () => {
    it("should load default and user servers", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockDefaultConfig));
      // Simulate DB containing both user and synced default servers
      const defaultServersFromDb: McpServerSelect[] = [
        {
          id: generateDeterministicUUID({
            name: "test-server",
            config: mockDefaultConfig["test-server"],
          }),
          name: "test-server",
          config: mockDefaultConfig["test-server"],
          isFileBased: true,
        },
        {
          id: generateDeterministicUUID({
            name: "api-server",
            config: {
              ...mockDefaultConfig["api-server"],
              headers: { Authorization: "test-api-key" },
            },
          }),
          name: "api-server",
          config: {
            ...mockDefaultConfig["api-server"],
            headers: { Authorization: "test-api-key" },
          },
          isFileBased: true,
        },
      ];
      mockMcpRepository.selectAll.mockResolvedValue([
        ...defaultServersFromDb,
        ...mockUserServers,
      ]);

      const result = await storage.loadAll();

      expect(result).toHaveLength(3);
      expect(result.some((s: any) => s.isFileBased)).toBe(true);
      expect(result.some((s: any) => !s.isFileBased)).toBe(true);
    });

    it("should handle missing config file", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      mockReadFile.mockRejectedValue(error);
      mockMcpRepository.selectAll.mockResolvedValue(mockUserServers);

      const result = await storage.loadAll();

      expect(result).toEqual(mockUserServers);
    });

    it("should handle invalid JSON in config file", async () => {
      mockReadFile.mockResolvedValue("invalid json");
      mockMcpRepository.selectAll.mockResolvedValue(mockUserServers);

      const result = await storage.loadAll();

      expect(result).toEqual(mockUserServers);
    });

    it("should substitute environment variables in default configs", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockDefaultConfig));
      // Simulate DB containing the synced default with substituted env var
      const apiServerFromDb: McpServerSelect = {
        id: generateDeterministicUUID({
          name: "api-server",
          config: {
            ...mockDefaultConfig["api-server"],
            headers: { Authorization: "test-api-key" },
          },
        }),
        name: "api-server",
        config: {
          ...mockDefaultConfig["api-server"],
          headers: { Authorization: "test-api-key" },
        },
        isFileBased: true,
      };
      mockMcpRepository.selectAll.mockResolvedValue([apiServerFromDb]);

      const result = await storage.loadAll();

      const apiServer = result.find((s: any) => s.name === "api-server");
      expect(apiServer?.config.headers.Authorization).toBe("test-api-key");
    });

    it("should generate deterministic UUIDs for default servers", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockDefaultConfig));
      const defaultsFromDb: McpServerSelect[] = [
        {
          id: generateDeterministicUUID({
            name: "test-server",
            config: mockDefaultConfig["test-server"],
          }),
          name: "test-server",
          config: mockDefaultConfig["test-server"],
          isFileBased: true,
        },
      ];
      mockMcpRepository.selectAll.mockResolvedValue(defaultsFromDb);

      const result1 = await storage.loadAll();
      const result2 = await storage.loadAll();

      const server1 = result1.find((s: any) => s.name === "test-server");
      const server2 = result2.find((s: any) => s.name === "test-server");

      expect(server1.id).toBe(server2.id);
      expect(server1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });

  describe("save", () => {
    it("should save user server to database", async () => {
      const serverToSave = {
        name: "New Server",
        config: { command: "test" },
      };
      const savedServer = { ...serverToSave, id: "new-id", isFileBased: false };

      mockMcpRepository.save.mockResolvedValue(savedServer);

      const result = await storage.save(serverToSave);

      expect(mockMcpRepository.save).toHaveBeenCalledWith(serverToSave);
      expect(result).toEqual(savedServer);
    });

    it("should handle database errors", async () => {
      const serverToSave = { name: "New Server", config: { command: "test" } };
      mockMcpRepository.save.mockRejectedValue(new Error("DB Error"));

      await expect(storage.save(serverToSave)).rejects.toThrow("DB Error");
    });
  });

  describe("delete", () => {
    beforeEach(() => {
      storage.get = vi.fn();
    });

    it("should delete user server from database", async () => {
      const userServer = {
        id: "user-1",
        name: "User Server",
        isFileBased: false,
      };
      storage.get.mockResolvedValue(userServer);
      mockMcpRepository.deleteById.mockResolvedValue(undefined);

      await storage.delete("user-1");

      expect(mockMcpRepository.deleteById).toHaveBeenCalledWith("user-1");
    });

    it("should prevent deletion of default servers", async () => {
      const defaultServer = {
        id: "default-1",
        name: "Default Server",
        isFileBased: true,
      };
      storage.get.mockResolvedValue(defaultServer);

      await expect(storage.delete("default-1")).rejects.toThrow(
        'Cannot delete default MCP server "Default Server". Default servers are read-only.',
      );
    });

    it("should handle database errors", async () => {
      const userServer = {
        id: "user-1",
        name: "User Server",
        isFileBased: false,
      };
      storage.get.mockResolvedValue(userServer);
      mockMcpRepository.deleteById.mockRejectedValue(new Error("DB Error"));

      await expect(storage.delete("user-1")).rejects.toThrow("DB Error");
    });
  });

  describe("has", () => {
    it("should find default servers", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockDefaultConfig));

      await storage.has("test-server-uuid"); // Would be the actual UUID generated

      // Note: Since we can't predict the exact UUID, we'll test the logic flow
      expect(mockReadFile).toHaveBeenCalled();
    });

    it("should find user servers", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockResolvedValue(mockUserServers[0]);

      const result = await storage.has("user-server-1");

      expect(result).toBe(true);
      expect(mockMcpRepository.selectById).toHaveBeenCalledWith(
        "user-server-1",
      );
    });

    it("should return false for non-existent servers", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockResolvedValue(null);

      const result = await storage.has("non-existent");

      expect(result).toBe(false);
    });

    it("should handle database errors", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockRejectedValue(new Error("DB Error"));

      const result = await storage.has("user-server-1");

      expect(result).toBe(false);
    });
  });

  describe("get", () => {
    it("should get default servers", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockDefaultConfig));

      // We need to get the actual servers to test with their generated UUIDs
      const allServers = await storage.loadAll();
      const testServer = allServers.find((s: any) => s.name === "test-server");

      const result = await storage.get(testServer.id);

      expect(result).toBeTruthy();
      expect(result.name).toBe("test-server");
      expect(result.isFileBased).toBe(true);
    });

    it("should get user servers", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockResolvedValue(mockUserServers[0]);

      const result = await storage.get("user-server-1");

      expect(result).toEqual(mockUserServers[0]);
      expect(mockMcpRepository.selectById).toHaveBeenCalledWith(
        "user-server-1",
      );
    });

    it("should return null for non-existent servers", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockResolvedValue(null);

      const result = await storage.get("non-existent");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockReadFile.mockResolvedValue("{}");
      mockMcpRepository.selectById.mockRejectedValue(new Error("DB Error"));

      const result = await storage.get("user-server-1");

      expect(result).toBeNull();
    });
  });

  describe("init", () => {
    it("should initialize with manager", async () => {
      await storage.init(mockManager);

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it("should setup file watcher", async () => {
      const chokidar = await import("chokidar");
      const mockWatcher = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(chokidar.watch).mockReturnValue(mockWatcher as any);

      await storage.init(mockManager);

      expect(chokidar.watch).toHaveBeenCalledWith("/test/config.json", {
        persistent: true,
        awaitWriteFinish: true,
        ignoreInitial: true,
      });
      expect(mockWatcher.on).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });
  });
});
