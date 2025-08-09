import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";
import { sanitizeMcpConfig } from "lib/ai/mcp/sanitize-config";
import { MCP_DEFAULT_SERVERS_ENABLED, FILE_BASED_MCP_CONFIG } from "lib/const";

export async function GET() {
  // Use storage abstraction for hybrid/file modes, direct DB access for database-only mode (like main)
  const getServers = () => {
    if (FILE_BASED_MCP_CONFIG || MCP_DEFAULT_SERVERS_ENABLED) {
      return mcpClientsManager.loadAll(); // Hybrid/file modes need storage abstraction
    } else {
      return mcpRepository.selectAll(); // Database-only mode like main branch
    }
  };

  const [servers, memoryClients] = await Promise.all([
    getServers(),
    mcpClientsManager.getClients(),
  ]);

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = servers.filter((server) => !memoryMap.has(server.id));

  const serverIds = new Set(servers.map((s) => s.id));
  const removeTargets = memoryClients.filter(({ id }) => !serverIds.has(id));

  if (addTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      addTargets.map((server) => mcpClientsManager.refreshClient(server.id)),
    );
  }
  if (removeTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      removeTargets.map((client) =>
        mcpClientsManager.disconnectClient(client.id),
      ),
    );
  }

  const result = servers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const mcpInfo: MCPServerInfo & { id: string } = {
      id: server.id,
      name: server.name,
      config: sanitizeMcpConfig(server.config), // Sanitize sensitive data
      status: info?.status ?? "loading",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
      isFileBased: server.isFileBased, // Use server's isFileBased flag
    };
    return mcpInfo;
  });

  return Response.json(result);
}
