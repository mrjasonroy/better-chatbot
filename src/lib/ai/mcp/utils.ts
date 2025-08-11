import { createHash } from "crypto";
import type { McpServerSelect } from "app-types/mcp";
import type { MCPClientsManager } from "./create-mcp-clients-manager";
import { mcpRepository } from "lib/db/repository";
import equal from "lib/equal";
import defaultLogger from "logger";

/**
 * Recursively sort object keys to ensure deterministic JSON stringification
 */
function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj && typeof obj === "object") {
    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectKeys(obj[key]);
      });
    return sorted;
  }
  return obj;
}

/**
 * Generate a deterministic UUID v4 from a hash of the input data
 */
export function generateDeterministicUUID(data: any): string {
  const sortedData = sortObjectKeys(data);
  const dataString = JSON.stringify(sortedData);
  const hash = createHash("sha256").update(dataString).digest("hex");

  // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is one of [8, 9, a, b]
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}

/**
 * Substitute environment variables in a string
 */
export function substituteEnvVars(str: string): string {
  return str.replace(
    /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g,
    (match, braced, unbraced) => {
      const varName = braced || unbraced;
      return process.env[varName] || match;
    },
  );
}

/**
 * Recursively substitute environment variables in an object
 */
export function substituteEnvVarsInObject(obj: any): any {
  if (typeof obj === "string") {
    return substituteEnvVars(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(substituteEnvVarsInObject);
  } else if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVarsInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Shared utility to check and refresh MCP clients when storage changes
 * Uses deep equality to detect actual configuration changes
 */
export async function checkAndRefreshMCPClients(
  storageServers: McpServerSelect[],
  manager: MCPClientsManager,
  logger: ReturnType<typeof defaultLogger.withDefaults>,
): Promise<void> {
  try {
    logger.debug("Checking MCP clients diff");
    const managerClients = await manager.getClients();

    const storageServerMap = new Map(storageServers.map((s) => [s.id, s]));
    const managerClientMap = new Map(
      managerClients.map(({ id, client }) => [id, client.getInfo()]),
    );

    const promises: Promise<any>[] = [];

    // Check for new or modified servers
    for (const [id, storageServer] of storageServerMap.entries()) {
      const managerClientInfo = managerClientMap.get(id);
      if (
        !managerClientInfo ||
        !equal(storageServer.config, managerClientInfo.config)
      ) {
        logger.info(
          `Refreshing/adding MCP client ${storageServer.name} (${id})`,
        );
        promises.push(
          manager.addClient(
            id,
            storageServer.name,
            storageServer.config,
            storageServer.isFileBased,
          ),
        );
      }
    }

    // Check for removed servers
    for (const id of managerClientMap.keys()) {
      if (!storageServerMap.has(id)) {
        logger.info(`Removing MCP client ${id}`);
        promises.push(manager.removeClient(id));
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  } catch (err) {
    logger.error("Error checking and refreshing clients:", err);
  }
}

/**
 * Sync file-based servers to database for OAuth foreign key constraint support
 * Adds/updates file-based servers and removes ones no longer in file config
 */
/**
 * Marks database servers as file-based if they have deterministic UUIDs
 */
export function markFileBasedServers(
  dbServers: McpServerSelect[],
): McpServerSelect[] {
  return dbServers.map((server) => {
    // Check if this server has a deterministic UUID (file-based)
    const expectedId = generateDeterministicUUID({
      name: server.name,
      config: server.config,
    });

    return {
      ...server,
      isFileBased: server.id === expectedId,
    };
  });
}

export async function syncFileBasedServersToDatabase(
  fileBasedServers: McpServerSelect[],
  logger: ReturnType<typeof defaultLogger.withDefaults>,
): Promise<void> {
  try {
    // Get all current database servers
    const dbServers = await mcpRepository.selectAll();
    const fileBasedServerIds = new Set(
      fileBasedServers.map((server) => server.id),
    );

    // Add/update file-based servers in database
    for (const server of fileBasedServers) {
      try {
        await mcpRepository.save({
          id: server.id,
          name: server.name,
          config: server.config,
        });
        logger.debug(`Synced file-based server '${server.name}' to database`);
      } catch (error) {
        logger.error(
          `Failed to sync server '${server.name}' to database:`,
          error,
        );
      }
    }

    // Remove database servers that are no longer in file config
    // Only remove servers with deterministic UUIDs (file-based servers)
    for (const dbServer of dbServers) {
      if (!fileBasedServerIds.has(dbServer.id)) {
        // Check if this looks like a deterministic UUID (file-based)
        // We can identify these by regenerating the UUID from name+config
        const expectedId = generateDeterministicUUID({
          name: dbServer.name,
          config: dbServer.config,
        });

        if (dbServer.id === expectedId) {
          // This is a file-based server that's no longer in config
          try {
            await mcpRepository.deleteById(dbServer.id);
            logger.info(
              `Removed file-based server '${dbServer.name}' from database (no longer in config)`,
            );
          } catch (error) {
            logger.error(
              `Failed to remove server '${dbServer.name}' from database:`,
              error,
            );
          }
        } else {
          // This is a user-created server, keep it
          logger.debug(`Keeping user-created server '${dbServer.name}'`);
        }
      }
    }
  } catch (error) {
    logger.error("Failed to sync file-based servers to database:", error);
  }
}
