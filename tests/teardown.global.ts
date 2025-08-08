import { drizzle } from "drizzle-orm/node-postgres";
import {
  UserSchema,
  SessionSchema,
  AgentSchema,
  BookmarkSchema,
  ChatThreadSchema,
} from "../src/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { config } from "dotenv";

config();

const db = drizzle(process.env.POSTGRES_URL!);

const testUserIds = [
  "00000000-1111-2222-3333-444444444444",
  "11111111-2222-3333-4444-555555555555",
];

async function cleanup() {
  console.log("Cleaning up test data...");

  try {
    // Delete in reverse order due to foreign key constraints

    // Delete chat threads
    for (const userId of testUserIds) {
      await db
        .delete(ChatThreadSchema)
        .where(eq(ChatThreadSchema.userId, userId));
    }

    // Delete bookmarks
    for (const userId of testUserIds) {
      await db.delete(BookmarkSchema).where(eq(BookmarkSchema.userId, userId));
    }

    // Delete agents
    for (const userId of testUserIds) {
      await db.delete(AgentSchema).where(eq(AgentSchema.userId, userId));
    }

    // Delete sessions
    for (const userId of testUserIds) {
      await db.delete(SessionSchema).where(eq(SessionSchema.userId, userId));
    }

    // Delete users last
    for (const userId of testUserIds) {
      await db.delete(UserSchema).where(eq(UserSchema.id, userId));
    }

    console.log("Test data cleaned up successfully");
  } catch (error) {
    console.error("Error cleaning up test data:", error);
  }

  process.exit(0);
}

export default cleanup;
