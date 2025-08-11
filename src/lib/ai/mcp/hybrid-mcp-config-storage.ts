import type { MCPServerConfig, McpServerSelect } from "app-types/mcp";
import { readFile } from "fs/promises";
import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import { createDebounce } from "lib/utils";
import defaultLogger from "logger";
import { MCP_CONFIG_PATH } from "lib/ai/mcp/config-path";
import { colorize } from "consola/utils";
import { mcpRepository } from "lib/db/repository";
import {
  generateDeterministicUUID,
  substituteEnvVarsInObject,
  checkAndRefreshMCPClients,
  syncFileBasedServersToDatabase,
} from "./utils";

const logger = defaultLogger.withDefaults({
  message: colorize("gray", `MCP Hybrid Config Storage: `),
});
export function createHybridMCPConfigStorage(
  defaultConfigPath?: string,
): MCPConfigStorage {
  const configPath = defaultConfigPath || MCP_CONFIG_PATH;
  let watcher: FSWatcher | null = null;
  let manager: MCPClientsManager;
  const debounce = createDebounce();

  async function readDefaultConfigFile(): Promise<McpServerSelect[]> {
    try {
      const configText = await readFile(configPath, { encoding: "utf-8" });
      const rawConfig = JSON.parse(configText ?? "{}") as {
        [name: string]: MCPServerConfig;
      };

      const config = substituteEnvVarsInObject(rawConfig) as {
        [name: string]: MCPServerConfig;
      };

      return toMcpServerArray(config, true);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        logger.debug(`Default config file not found at: ${configPath}`);
        return [];
      } else if (err instanceof SyntaxError) {
        logger.warn(
          `Default config file ${configPath} has invalid JSON: ${err.message}`,
        );
        return [];
      } else {
        logger.error("Error reading default config file:", err);
        return [];
      }
    }
  }

  async function loadUserServers(): Promise<McpServerSelect[]> {
    try {
      const servers = await mcpRepository.selectAll();
      return servers;
    } catch (error) {
      logger.error("Failed to load user MCP configs from database:", error);
      return [];
    }
  }

  async function loadAllServers(): Promise<McpServerSelect[]> {
    const [defaultServers, userServers] = await Promise.all([
      readDefaultConfigFile(),
      loadUserServers(),
    ]);

    // Sync file-based servers to database for OAuth support
    await syncFileBasedServersToDatabase(defaultServers, logger);

    return [...defaultServers, ...userServers];
  }

  async function checkAndRefreshClients() {
    const allServers = await loadAllServers();
    await checkAndRefreshMCPClients(allServers, manager, logger);
  }

  async function init(_manager: MCPClientsManager): Promise<void> {
    manager = _manager;

    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    try {
      watcher = chokidar.watch(configPath, {
        persistent: true,
        awaitWriteFinish: true,
        ignoreInitial: true,
      });

      watcher.on("change", () => {
        logger.info("Config file change detected, checking for updates...");
        debounce(checkAndRefreshClients, 1000);
      });
      logger.info(`Watching default MCP config file: ${configPath}`);
    } catch (err) {
      logger.warn("Could not setup file watcher for default config:", err);
    }
  }

  return {
    init,

    async loadAll() {
      return await loadAllServers();
    },

    async save(server) {
      try {
        const savedServer = await mcpRepository.save(server);
        return savedServer;
      } catch (error) {
        logger.error(
          `Failed to save MCP config "${server.name}" to database:`,
          error,
        );
        throw error;
      }
    },

    async delete(id) {
      const server = await this.get(id);
      if (server?.isFileBased) {
        throw new Error(
          `Cannot delete default MCP server "${server.name}". Default servers are read-only.`,
        );
      }

      try {
        await mcpRepository.deleteById(id);
      } catch (error) {
        logger.error(
          `Failed to delete MCP config "${id}" from database:`,
          error,
        );
        throw error;
      }
    },

    async has(id: string): Promise<boolean> {
      const defaultServers = await readDefaultConfigFile();
      if (defaultServers.some((s) => s.id === id)) {
        return true;
      }

      try {
        const server = await mcpRepository.selectById(id);
        return !!server;
      } catch (error) {
        logger.error(`Failed to check MCP config "${id}" in database:`, error);
        return false;
      }
    },

    async get(id) {
      const defaultServers = await readDefaultConfigFile();
      const defaultServer = defaultServers.find((s) => s.id === id);
      if (defaultServer) {
        return defaultServer;
      }

      try {
        const server = await mcpRepository.selectById(id);
        return server;
      } catch (error) {
        logger.error(`Failed to get MCP config "${id}" from database:`, error);
        return null;
      }
    },
  };
}

function toMcpServerArray(
  config: Record<string, MCPServerConfig>,
  isFileBased: boolean = false,
): McpServerSelect[] {
  return Object.entries(config).map(([name, config]) => {
    let id = name;
    if (isFileBased) {
      id = generateDeterministicUUID({ name, config });
    }

    return {
      id,
      name,
      config,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isFileBased,
    };
  });
}
