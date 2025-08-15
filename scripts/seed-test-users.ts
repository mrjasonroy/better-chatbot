#!/usr/bin/env tsx
/**
 * Script to seed test users using Better Auth's APIs
 * Creates 21 users with proper password hashing via Better Auth
 *
 * Usage:
 *   npm run seed:test-users
 *   pnpm seed:test-users
 */

import { config } from "dotenv";

// Load environment variables FIRST
if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

import { auth } from "../src/lib/auth/auth-instance";
import { USER_ROLES } from "../src/types/roles";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { UserSchema } from "../src/lib/db/pg/schema.pg";
import { like } from "drizzle-orm";

// Create database connection
const db = drizzle(process.env.POSTGRES_URL!);

async function clearExistingTestUsers() {
  console.log("🧹 Clearing existing test users...");

  try {
    // Clean up ALL test users with reliable patterns
    const testEmailPatterns = [
      "%@test-seed.local%", // Our main seeded test domain
      "%playwright%", // Dynamically created playwright users
      "%@example.com%", // General test signup users
      "%testuser%@testuser.com%", // Legacy test users
      "%testuser%@gmail.com%", // Legacy test users
    ];

    console.log("Deleting users matching test patterns...");
    for (const pattern of testEmailPatterns) {
      await db.delete(UserSchema).where(like(UserSchema.email, pattern));
      console.log(`  Deleted users matching pattern ${pattern}`);
    }

    // Also clean up any remaining legacy test users by exact email match
    const legacyTestEmails = [
      "admin@testuser.com",
      "editor@testuser.com",
      "user@testuser.com",
    ];

    for (let i = 4; i <= 21; i++) {
      legacyTestEmails.push(`testuser${i}@testuser.com`);
      legacyTestEmails.push(`testuser${i}@gmail.com`);
    }

    if (legacyTestEmails.length > 0) {
      console.log("Cleaning up legacy test emails...");
      for (const email of legacyTestEmails) {
        await db.delete(UserSchema).where(sql`email = ${email}`);
      }
    }
  } catch (error) {
    console.log(
      "Note: Error during cleanup (may be expected if tables are empty):",
      error,
    );
  }
}

async function createUserWithBetterAuth(userData: {
  email: string;
  password: string;
  name: string;
  role?: string;
  banned?: boolean;
  banReason?: string;
}) {
  try {
    // Use Better Auth's signUp API to create user with proper password hashing
    const result = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
      },
      headers: new Headers({
        "content-type": "application/json",
      }),
    });

    if (!result.user) {
      throw new Error("User creation failed");
    }

    // Update user role if needed
    if (userData.role && userData.role !== USER_ROLES.USER) {
      try {
        await db
          .update(UserSchema)
          .set({ role: userData.role })
          .where(sql`id = ${result.user.id}`);
      } catch (error) {
        console.warn(`Could not set role for ${userData.email}:`, error);
      }
    }

    // Ban user if needed - do this via direct database update since we don't have admin auth
    if (userData.banned && userData.banReason) {
      try {
        await db
          .update(UserSchema)
          .set({
            banned: true,
            banReason: userData.banReason,
            banExpires: null, // Permanent ban for testing
          })
          .where(sql`id = ${result.user.id}`);
      } catch (error) {
        console.warn(`Could not ban user ${userData.email}:`, error);
      }
    }

    return result.user;
  } catch (error) {
    console.error(`Failed to create user ${userData.email}:`, error);
    throw error;
  }
}

async function seedTestUsers() {
  console.log("🌱 Starting test user seeding using Better Auth APIs...");

  try {
    // Clear existing test users first
    await clearExistingTestUsers();
    console.log("✅ Existing test users cleared");

    console.log("👤 Creating main test users...");

    // 1. Admin User
    const adminUser = await createUserWithBetterAuth({
      email: "admin@test-seed.local",
      password: "AdminPassword123!",
      name: "Test Admin User",
      role: USER_ROLES.ADMIN,
    });
    console.log("✅ Created admin user:", adminUser.id);

    // 2. Editor User
    const editorUser = await createUserWithBetterAuth({
      email: "editor@test-seed.local",
      password: "EditorPassword123!",
      name: "Test Editor User",
      role: USER_ROLES.EDITOR,
    });
    console.log("✅ Created editor user:", editorUser.id);

    // 3. Regular User
    const regularUser = await createUserWithBetterAuth({
      email: "user@test-seed.local",
      password: "UserPassword123!",
      name: "Test Regular User",
      role: USER_ROLES.USER,
    });
    console.log("✅ Created regular user:", regularUser.id);

    // 4. Create additional test users
    console.log("👥 Creating additional test users...");
    let createdCount = 3;

    for (let i = 4; i <= 21; i++) {
      try {
        const isEditor = i <= 9;
        const isBanned = i === 21;
        const email = `testuser${i}@test-seed.local`;

        await createUserWithBetterAuth({
          email,
          password: `TestPass${i}!`,
          name: `Test User ${i}`,
          role: isEditor ? USER_ROLES.EDITOR : USER_ROLES.USER,
          banned: isBanned,
          banReason: isBanned ? "Test ban for E2E testing" : undefined,
        });
        createdCount++;
        console.log(`✅ Created user ${i}`);
      } catch (_error) {
        console.warn(`⚠️ Failed to create user ${i}, continuing...`);
      }
    }

    console.log(
      `\n✅ Test data seeded successfully! Created ${createdCount} users.`,
    );

    console.log("\n🔑 Test Credentials:");
    console.log("  Admin: admin@test-seed.local / AdminPassword123!");
    console.log("  Editor: editor@test-seed.local / EditorPassword123!");
    console.log("  Regular: user@test-seed.local / UserPassword123!");
    console.log("  Others: testuser{4-21}@test-seed.local / TestPass{n}!");

    console.log("\n📁 Auth Files Will Be Created:");
    console.log("  - tests/.auth/admin.json (admin user)");
    console.log("  - tests/.auth/editor-user.json (editor user)");
    console.log("  - tests/.auth/regular-user.json (regular user)");
    console.log("  - tests/.auth/user1.json (backward compatibility - admin)");
    console.log("  - tests/.auth/user2.json (backward compatibility - editor)");
  } catch (error) {
    console.error("❌ Error seeding test users:", error);
    throw error;
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUsers()
    .then(() => {
      console.log("🎉 Seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
