import { agentRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { AgentUpdateSchema } from "app-types/agent";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const agent = await agentRepository.selectAgentById(id, session.user.id);

  if (!agent) {
    return Response.json(
      {
        error: "Agent not found",
      },
      { status: 404 },
    );
  }

  return Response.json(agent);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = AgentUpdateSchema.parse(body);

    // Verify ownership before updating
    const existingAgent = await agentRepository.selectAgentById(
      id,
      session.user.id,
    );
    if (!existingAgent) {
      return Response.json(
        { error: "Agent not found or access denied" },
        { status: 404 },
      );
    }

    const agent = await agentRepository.updateAgent(id, session.user.id, data);
    serverCache.delete(CacheKeys.agentInstructions(agent.id));

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to update agent:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    await agentRepository.deleteAgent(id, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
