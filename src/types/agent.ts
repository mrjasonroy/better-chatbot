import z from "zod";
import { ChatMention, ChatMentionSchema } from "./chat";

export type AgentIcon = {
  type: "emoji";
  value: string;
  style?: Record<string, string>;
};

export const AgentVisibilitySchema = z.enum(["private", "public", "readonly"]);

export const AgentUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(8000).optional(),
  icon: z
    .object({
      type: z.literal("emoji"),
      value: z.string(),
      style: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  instructions: z.object({
    role: z.string().optional(),
    systemPrompt: z.string().optional(),
    mentions: z.array(ChatMentionSchema).optional(),
  }),
  visibility: AgentVisibilitySchema.optional(),
});

export const AgentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(8000).optional(),
  icon: z
    .object({
      type: z.literal("emoji"),
      value: z.string(),
      style: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  instructions: z
    .object({
      role: z.string().optional(),
      systemPrompt: z.string().optional(),
      mentions: z.array(ChatMentionSchema).optional(),
    })
    .optional(),
  visibility: AgentVisibilitySchema.optional(),
});

export const AgentQuerySchema = z.object({
  type: z.enum(["all", "mine", "shared", "bookmarked"]).default("all"),
  filters: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type AgentVisibility = z.infer<typeof AgentVisibilitySchema>;

export type AgentSummary = {
  id: string;
  name: string;
  description?: string;
  icon?: AgentIcon;
  userId: string;
  visibility: AgentVisibility;
  createdAt: Date;
  updatedAt: Date;
  userName?: string;
  userAvatar?: string;
  isBookmarked?: boolean;
};

export type Agent = AgentSummary & {
  instructions: {
    role?: string;
    systemPrompt?: string;
    mentions?: ChatMention[];
  };
};

export type AgentRepository = {
  insertAgent(
    agent: Omit<Agent, "id" | "createdAt" | "updatedAt">,
  ): Promise<Agent>;

  selectAgentById(id: string, userId: string): Promise<Agent | null>;

  selectAgentsByUserId(userId: string): Promise<Agent[]>;

  updateAgent(
    id: string,
    userId: string,
    agent: Partial<
      Pick<
        Agent,
        "name" | "description" | "icon" | "instructions" | "visibility"
      >
    >,
  ): Promise<Agent>;

  upsertAgent(
    agent: Omit<Agent, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<Agent>;

  deleteAgent(id: string, userId: string): Promise<void>;

  selectAgents(
    currentUserId: string,
    filters?: ("all" | "mine" | "shared" | "bookmarked")[],
    limit?: number,
  ): Promise<AgentSummary[]>;
};

export const AgentGenerateSchema = z.object({
  name: z.string().describe("Agent name"),
  description: z.string().describe("Agent description"),
  instructions: z.string().describe("Agent instructions"),
  role: z.string().describe("Agent role"),
  tools: z
    .array(z.string())
    .describe("Agent allowed tools name")
    .optional()
    .default([]),
});
