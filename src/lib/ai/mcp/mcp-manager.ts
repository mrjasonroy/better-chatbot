import { createDbBasedMCPConfigsStorage } from "./db-mcp-config-storage";
import { createFileBasedMCPConfigsStorage } from "./fb-mcp-config-storage";
import { createHybridMCPConfigStorage } from "./hybrid-mcp-config-storage";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "./create-mcp-clients-manager";
import { FILE_BASED_MCP_CONFIG, MCP_DEFAULT_SERVERS_ENABLED } from "lib/const";
declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager;
}

if (!globalThis.__mcpClientsManager__) {
  // Choose the appropriate storage implementation based on environment
  let storage;

  if (FILE_BASED_MCP_CONFIG) {
    // Pure file-based storage (development mode)
    storage = createFileBasedMCPConfigsStorage();
  } else if (MCP_DEFAULT_SERVERS_ENABLED) {
    // Hybrid storage: defaults from file + user servers in database (enterprise mode)
    storage = createHybridMCPConfigStorage();
  } else {
    // Pure database storage (default mode)
    storage = createDbBasedMCPConfigsStorage();
  }

  globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
}

export const initMCPManager = async () => {
  return globalThis.__mcpClientsManager__.init();
};

export const mcpClientsManager = globalThis.__mcpClientsManager__;
