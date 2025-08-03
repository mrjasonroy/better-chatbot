#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Convert .env file to Helm values-local.yaml
 * Usage: tsx scripts/env-to-helm-values.ts
 */

const ENV_FILE = ".env";
const VALUES_FILE = "helm/better-chatbot/values-local.yaml";
const _TEMPLATE_FILE = "helm/better-chatbot/values-local.example.yaml";

// Environment variables that go into secrets
const SECRET_VARS = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "XAI_API_KEY",
  "EXA_API_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
];

// Environment variables that go into config
const CONFIG_VARS = [
  "NODE_ENV",
  "NEXT_TELEMETRY_DISABLED",
  "FILE_BASED_MCP_CONFIG",
];

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    throw new Error(`Environment file ${filePath} not found`);
  }

  const content = readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Parse key=value
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && value) {
      env[key] = value;
    }
  }

  return env;
}

function generateHelmValues(env: Record<string, string>): string {
  let yaml = `# Auto-generated from .env file
# Generated on: ${new Date().toISOString()}

# PostgreSQL configuration for local development
postgresql:
  enabled: true
  auth:
    database: "better_chatbot"
    username: "better_chatbot"
    password: "dev_password"

# Configuration variables
config:
`;

  // Add config variables
  for (const key of CONFIG_VARS) {
    if (env[key]) {
      yaml += `  ${key}: "${env[key]}"
`;
    }
  }

  // Default config values if not in .env
  if (!env.NODE_ENV) {
    yaml += `  NODE_ENV: "development"
`;
  }
  if (!env.NEXT_TELEMETRY_DISABLED) {
    yaml += `  NEXT_TELEMETRY_DISABLED: "1"
`;
  }

  yaml += `
# Secrets
secrets:
`;

  // Add secret variables
  for (const key of SECRET_VARS) {
    if (env[key]) {
      yaml += `  ${key}: "${env[key]}"
`;
    }
  }

  yaml += `
# Local development settings
service:
  type: ClusterIP
  port: 3000

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

ingress:
  enabled: false

replicaCount: 1

autoscaling:
  enabled: false
`;

  return yaml;
}

function main() {
  try {
    console.log("🔄 Converting .env to Helm values...");

    // Parse .env file
    const env = parseEnvFile(ENV_FILE);
    console.log(`✅ Found ${Object.keys(env).length} environment variables`);

    // Generate Helm values
    const helmValues = generateHelmValues(env);

    // Write values file
    writeFileSync(VALUES_FILE, helmValues);
    console.log(`✅ Generated ${VALUES_FILE}`);

    // Check for required secrets
    const missingSecrets = [
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "BETTER_AUTH_SECRET",
    ].filter((key) => !env[key]);

    if (missingSecrets.length > 0) {
      console.log("⚠️  Missing required secrets:");
      for (const key of missingSecrets) {
        console.log(`   - ${key}`);
      }
      console.log("   Please add these to your .env file");
    }

    console.log(`
🚀 Ready to deploy with:
   docker build -t better-chatbot:latest -f docker/Dockerfile .
   helm install dev-chatbot ./helm/better-chatbot -f ${VALUES_FILE}
`);
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
