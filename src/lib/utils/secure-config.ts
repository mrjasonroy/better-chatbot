import { MCPServerConfig } from "app-types/mcp";

/**
 * Recursively substitutes environment variables in a configuration object
 * Supports ${VAR_NAME} and $VAR_NAME syntax
 */
export function substituteEnvVars<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Support both ${VAR} and $VAR syntax
    return obj.replace(
      /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g,
      (match, p1, p2) => {
        const varName = p1 || p2;
        return process.env[varName] || match;
      },
    ) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVars(item)) as T;
  }

  if (typeof obj === "object") {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      (result as any)[key] = substituteEnvVars(value);
    }
    return result;
  }

  return obj;
}

/**
 * List of sensitive field names that should be hidden in responses
 */
const SENSITIVE_FIELDS = [
  "token",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "id_token",
  "idToken",
  "password",
  "secret",
  "api_key",
  "apiKey",
  "key",
  "private_key",
  "privateKey",
  "authorization",
  "auth",
  "bearer",
  "client_secret",
  "clientSecret",
];

/**
 * Recursively sanitizes sensitive data from an object by replacing values with [HIDDEN]
 */
export function sanitizeSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSensitiveData(item)) as T;
  }

  if (typeof obj === "object") {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(
        (field) => lowerKey.includes(field) || lowerKey === field,
      );

      if (isSensitive && typeof value === "string" && value.length > 0) {
        (result as any)[key] = "[HIDDEN]";
      } else {
        (result as any)[key] = sanitizeSensitiveData(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Sanitizes MCP server config specifically, hiding auth tokens and sensitive headers
 */
export function sanitizeMcpConfig(config: MCPServerConfig): MCPServerConfig {
  return sanitizeSensitiveData(config);
}

/**
 * Processes MCP config for storage - applies environment variable substitution
 */
export function processMcpConfigForStorage(
  config: MCPServerConfig,
): MCPServerConfig {
  return substituteEnvVars(config);
}

/**
 * Processes MCP config for API response - sanitizes sensitive data
 */
export function processMcpConfigForResponse(
  config: MCPServerConfig,
): MCPServerConfig {
  return sanitizeMcpConfig(config);
}
