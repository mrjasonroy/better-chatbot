import { describe, expect, it, beforeEach, vi } from "vitest";
import { syncFileBasedServersToDatabase } from "./utils";
import type { McpServerSelect } from "app-types/mcp";

// Mock server-only modules
vi.mock("lib/logger", () => ({
  default: {
    withDefaults: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("lib/utils", () => ({
  generateUUID: vi.fn(() => "mock-uuid-123"),
}));

vi.mock("consola/utils", () => ({
  colorize: vi.fn((_style, text) => text),
}));

// Mock the repository and OAuth repository
vi.mock("lib/db/repository", () => ({
  mcpRepository: {
    selectAll: vi.fn(),
    save: vi.fn(),
    deleteById: vi.fn(),
  },
}));

vi.mock("lib/db/pg/repositories/mcp-oauth-repository.pg", () => ({
  pgMcpOAuthRepository: {
    getAuthenticatedSession: vi.fn(),
    getSessionByState: vi.fn(),
    createSession: vi.fn(),
    updateSessionByState: vi.fn(),
    saveTokensAndCleanup: vi.fn(),
    deleteByState: vi.fn(),
  },
}));

describe("OAuth Integration with File-Based Server Sync", () => {
  let mockLogger: any;
  let mockMcpRepository: any;

  beforeEach(async () => {
    // Get the mocked repositories
    const { mcpRepository } = await import("lib/db/repository");

    mockMcpRepository = mcpRepository;

    vi.clearAllMocks();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
  });

  it("should sync file-based server to database for OAuth compatibility", async () => {
    // Setup: File-based server data
    const fileBasedServers: McpServerSelect[] = [
      {
        id: "file-server-oauth-test",
        name: "OAuth Test Server",
        config: { url: "https://oauth.example.com" },
        isFileBased: true,
      },
    ];

    // Mock empty database initially
    mockMcpRepository.selectAll.mockResolvedValue([]);
    mockMcpRepository.save.mockResolvedValue({
      id: "file-server-oauth-test",
      name: "OAuth Test Server",
      config: { url: "https://oauth.example.com" },
    });

    // Sync file-based servers to database
    await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

    // Verify server was synced to database (OAuth foreign key constraint satisfied)
    expect(mockMcpRepository.save).toHaveBeenCalledWith({
      id: "file-server-oauth-test",
      name: "OAuth Test Server",
      config: { url: "https://oauth.example.com" },
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Synced file-based server 'OAuth Test Server' to database",
    );

    // At this point, OAuth sessions can reference this server ID without FK violations
    // The actual OAuth provider instantiation is tested separately
  });

  it("should handle OAuth for multiple synced file-based servers", async () => {
    const fileBasedServers: McpServerSelect[] = [
      {
        id: "server-1",
        name: "Server 1",
        config: { url: "https://server1.com" },
        isFileBased: true,
      },
      {
        id: "server-2",
        name: "Server 2",
        config: { url: "https://server2.com" },
        isFileBased: true,
      },
    ];

    mockMcpRepository.selectAll.mockResolvedValue([]);
    mockMcpRepository.save.mockResolvedValue({});

    // Sync all servers
    await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

    // Verify both servers were synced
    expect(mockMcpRepository.save).toHaveBeenCalledTimes(2);
    expect(mockMcpRepository.save).toHaveBeenNthCalledWith(1, {
      id: "server-1",
      name: "Server 1",
      config: { url: "https://server1.com" },
    });
    expect(mockMcpRepository.save).toHaveBeenNthCalledWith(2, {
      id: "server-2",
      name: "Server 2",
      config: { url: "https://server2.com" },
    });

    // Both servers should now be available for OAuth without FK constraint errors
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Synced file-based server 'Server 1' to database",
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Synced file-based server 'Server 2' to database",
    );
  });

  it("should handle sync errors gracefully without breaking OAuth", async () => {
    const fileBasedServers: McpServerSelect[] = [
      {
        id: "error-server",
        name: "Error Server",
        config: { url: "https://error.com" },
        isFileBased: true,
      },
    ];

    // Mock database error
    mockMcpRepository.selectAll.mockRejectedValue(
      new Error("Database unavailable"),
    );

    // Sync should handle error gracefully
    await syncFileBasedServersToDatabase(fileBasedServers, mockLogger);

    // Error should be logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to sync file-based servers to database:",
      expect.any(Error),
    );

    // OAuth can still be attempted (though it may fail due to missing DB record)
    // This test verifies the sync doesn't throw and break the entire system
  });
});
