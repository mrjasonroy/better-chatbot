import type { MCPServerConfig } from "app-types/mcp";

/**
 * Patterns that indicate sensitive data that should be sanitized
 */
const SENSITIVE_PATTERNS = [
  "auth",
  "key",
  "token",
  "secret",
  "password",
  "credential",
];

/**
 * Checks if a string contains sensitive data patterns
 */
function isSensitive(str: string): boolean {
  const lower = str.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Sanitizes command line arguments, hiding values that appear after sensitive keys
 */
function sanitizeArgs(args: string[]): string[] {
  const sanitized: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    sanitized.push(arg);

    // Check if this argument is a sensitive flag/option
    if (isSensitive(arg)) {
      // If the next argument exists and doesn't start with '-', it's likely the value
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i++; // Skip the next argument
        sanitized.push("***HIDDEN***");
      }
    }

    // Handle format like "--header authorization:secret" or "authorization:secret"
    if (arg.includes(":") && isSensitive(arg.split(":")[0])) {
      // Replace the value part after the colon
      const [key] = arg.split(":", 1);
      sanitized[sanitized.length - 1] = `${key}:***HIDDEN***`;
    }
  }

  return sanitized;
}

/**
 * Sanitizes MCP server configuration by hiding sensitive data
 * This prevents API keys, tokens, and other secrets from being exposed to the client
 */
export function sanitizeMcpConfig(config: MCPServerConfig): MCPServerConfig {
  // Create a deep copy to avoid mutating the original
  const sanitized = { ...config };

  // Sanitize remote server headers
  if ("url" in sanitized && sanitized.headers) {
    sanitized.headers = Object.fromEntries(
      Object.entries(sanitized.headers).map(([key, value]) => [
        key,
        isSensitive(key) ? "***HIDDEN***" : value,
      ]),
    );
  }

  // Sanitize stdio configuration
  if ("command" in sanitized) {
    // Sanitize environment variables
    if (sanitized.env) {
      sanitized.env = Object.fromEntries(
        Object.entries(sanitized.env).map(([key, value]) => [
          key,
          isSensitive(key) ? "***HIDDEN***" : value,
        ]),
      );
    }

    // Sanitize command line arguments
    if (sanitized.args) {
      sanitized.args = sanitizeArgs(sanitized.args);
    }
  }

  return sanitized;
}
