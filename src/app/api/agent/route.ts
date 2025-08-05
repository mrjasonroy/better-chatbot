import { agentRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { AgentUpsertSchema, AgentQuerySchema } from "app-types/agent";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const {
      type,
      filters: filtersParam,
      limit,
    } = AgentQuerySchema.parse(queryParams);

    // Parse filters - can be passed as comma-separated string or single type
    let filters;
    if (filtersParam) {
      filters = filtersParam.split(",").map((f) => f.trim());
    } else {
      // Fallback to single type parameter for backward compatibility
      filters = [type];
    }

    // Use the new simplified selectAgents method with database-level filtering and limiting
    const agents = await agentRepository.selectAgents(
      session.user.id,
      filters,
      limit,
    );
    return Response.json(agents);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to fetch agents:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const data = AgentUpsertSchema.parse(body);

    // If updating an existing agent, check access
    if (data.id) {
      const hasAccess = await agentRepository.checkAccess(
        data.id,
        session.user.id,
        false, // readOnly = false for write operations
      );

      if (!hasAccess) {
        return new Response("Unauthorized", { status: 401 });
      }

      // For non-owners of public agents, preserve original visibility
      const existingAgent = await agentRepository.selectAgentById(
        data.id,
        session.user.id,
      );
      if (existingAgent && existingAgent.userId !== session.user.id) {
        data.visibility = existingAgent.visibility;
      }
    }

    const agent = await agentRepository.upsertAgent({
      ...data,
      userId: session.user.id, // Always use current user's ID for new agents
      visibility: data.visibility || "private",
    });
    serverCache.delete(CacheKeys.agentInstructions(agent.id));

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to upsert agent:", error);
    return Response.json(
      { message: "Internal Server Error" },
      {
        status: 500,
      },
    );
  }
}
