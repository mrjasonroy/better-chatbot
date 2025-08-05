import { Agent, AgentRepository, AgentSummary } from "app-types/agent";
import { pgDb as db } from "../db.pg";
import { AgentSchema, BookmarkSchema, UserSchema } from "../schema.pg";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgAgentRepository: AgentRepository = {
  async insertAgent(agent) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        instructions: agent.instructions,
        visibility: agent.visibility || "private",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Agent;
  },

  async selectAgentById(id, userId) {
    const [result] = await db
      .select()
      .from(AgentSchema)
      .where(
        and(
          eq(AgentSchema.id, id),
          or(
            eq(AgentSchema.userId, userId), // Own agent
            eq(AgentSchema.visibility, "public"), // Public agent
            eq(AgentSchema.visibility, "readonly"), // Readonly agent
          ),
        ),
      );
    return result as Agent | null;
  },

  async selectAgentsByUserId(userId) {
    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        instructions: AgentSchema.instructions,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`false`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .where(eq(AgentSchema.userId, userId))
      .orderBy(desc(AgentSchema.createdAt));

    // Map database nulls to undefined and set defaults for owned agents
    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
      isBookmarked: false, // Always false for owned agents
    }));
  },

  async updateAgent(id, userId, agent) {
    const [result] = await db
      .update(AgentSchema)
      .set({
        ...(agent as object),
        updatedAt: new Date(),
      })
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)))
      .returning();
    return result as Agent;
  },

  async upsertAgent(agent) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: agent.id || generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        instructions: agent.instructions,
        visibility: agent.visibility || "private",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [AgentSchema.id],
        set: {
          name: agent.name,
          description: agent.description,
          icon: agent.icon,
          instructions: agent.instructions,
          visibility: agent.visibility,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as Agent;
  },

  async deleteAgent(id, userId) {
    await db
      .delete(AgentSchema)
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)));
  },

  async selectAgents(
    currentUserId,
    filters = ["all"],
    limit = 50,
  ): Promise<AgentSummary[]> {
    let orConditions: any[] = [];

    // Build OR conditions based on filters array
    for (const filter of filters) {
      if (filter === "mine") {
        orConditions.push(eq(AgentSchema.userId, currentUserId));
      } else if (filter === "shared") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(
              eq(AgentSchema.visibility, "public"),
              eq(AgentSchema.visibility, "readonly"),
            ),
          ),
        );
      } else if (filter === "bookmarked") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(
              eq(AgentSchema.visibility, "public"),
              eq(AgentSchema.visibility, "readonly"),
            ),
            sql`${BookmarkSchema.id} IS NOT NULL`,
          ),
        );
      } else if (filter === "all") {
        // All available agents (mine + shared) - this overrides other filters
        orConditions = [
          or(
            // My agents
            eq(AgentSchema.userId, currentUserId),
            // Shared agents
            and(
              ne(AgentSchema.userId, currentUserId),
              or(
                eq(AgentSchema.visibility, "public"),
                eq(AgentSchema.visibility, "readonly"),
              ),
            ),
          ),
        ];
        break; // "all" overrides everything else
      }
    }

    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        // Exclude instructions from list queries for performance
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`CASE WHEN ${BookmarkSchema.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .leftJoin(
        BookmarkSchema,
        and(
          eq(BookmarkSchema.itemId, AgentSchema.id),
          eq(BookmarkSchema.itemType, "agent"),
          eq(BookmarkSchema.userId, currentUserId),
        ),
      )
      .where(orConditions.length > 1 ? or(...orConditions) : orConditions[0])
      .orderBy(
        // My agents first, then bookmarked shared agents, then other shared agents
        sql`CASE WHEN ${AgentSchema.userId} = ${currentUserId} THEN 0 WHEN ${BookmarkSchema.id} IS NOT NULL THEN 1 ELSE 2 END`,
        desc(AgentSchema.createdAt),
      )
      .limit(limit);

    // Map database nulls to undefined
    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
    }));
  },

  async checkAccess(agentId, userId, readOnly = true) {
    const [agent] = await db
      .select({
        visibility: AgentSchema.visibility,
        userId: AgentSchema.userId,
      })
      .from(AgentSchema)
      .where(eq(AgentSchema.id, agentId));
    if (!agent) {
      return false;
    }
    if (userId == agent.userId) return true;
    if (agent.visibility === "private") {
      return false;
    }
    if (agent.visibility == "readonly" && !readOnly) return false;
    return true;
  },
};
