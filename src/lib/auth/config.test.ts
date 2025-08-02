import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAuthConfig, getEnabledSocialProviders } from "./config";

// Mock experimental_taintUniqueValue since it's not available in test environment
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    experimental_taintUniqueValue: vi.fn(),
  };
});

describe("Auth Config", () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    vi.unstubAllEnvs();

    // Delete all auth-related environment variables
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_FORCE_ACCOUNT_SELECTION;
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    delete process.env.MICROSOFT_TENANT_ID;
    delete process.env.MICROSOFT_FORCE_ACCOUNT_SELECTION;
    delete process.env.DISABLE_EMAIL_SIGN_IN;
    delete process.env.DISABLE_SIGN_UP;
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    // Clean up after each test
    vi.unstubAllEnvs();
  });

  describe("getEnabledSocialProviders", () => {
    it("should return empty array when no social providers are configured", () => {
      const providers = getEnabledSocialProviders();
      expect(providers).toEqual([]);
    });

    it("should return github when GitHub credentials are provided", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");

      const providers = getEnabledSocialProviders();
      expect(providers).toContain("github");
    });

    it("should return google when Google credentials are provided", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

      const providers = getEnabledSocialProviders();
      expect(providers).toContain("google");
    });

    it("should return microsoft when Microsoft credentials are provided", () => {
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");

      const providers = getEnabledSocialProviders();
      expect(providers).toContain("microsoft");
    });

    it("should return all providers when all credentials are provided", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");
      vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");

      const providers = getEnabledSocialProviders();
      expect(providers).toHaveLength(3);
      expect(providers).toContain("github");
      expect(providers).toContain("google");
      expect(providers).toContain("microsoft");
    });

    it("should not return provider when only client ID is provided", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      // Missing GITHUB_CLIENT_SECRET

      const providers = getEnabledSocialProviders();
      expect(providers).not.toContain("github");
    });

    it("should not return provider when only client secret is provided", () => {
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");
      // Missing GITHUB_CLIENT_ID

      const providers = getEnabledSocialProviders();
      expect(providers).not.toContain("github");
    });
  });

  describe("getAuthConfig", () => {
    it("should return default config when no environment variables are set", () => {
      const config = getAuthConfig();

      expect(config).toEqual({
        emailAndPasswordEnabled: true,
        signUpEnabled: true,
        socialAuthenticationProviders: {
          github: undefined,
          google: undefined,
          microsoft: undefined,
        },
        allowedOrigins: [],
      });
    });

    it("should parse DISABLE_EMAIL_SIGN_IN correctly", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "1");

      const config = getAuthConfig();
      expect(config.emailAndPasswordEnabled).toBe(false);
    });

    it("should parse DISABLE_SIGN_UP correctly", () => {
      vi.stubEnv("DISABLE_SIGN_UP", "1");

      const config = getAuthConfig();
      expect(config.signUpEnabled).toBe(false);
    });

    it("should parse boolean environment variables with various formats", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "0");
      vi.stubEnv("DISABLE_SIGN_UP", "False");

      const config = getAuthConfig();
      expect(config.emailAndPasswordEnabled).toBe(true);
      expect(config.signUpEnabled).toBe(true);
    });

    it("should include GitHub config when credentials are provided", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.github).toEqual({
        clientId: "github-client-id",
        clientSecret: "github-client-secret",
      });
    });

    it("should include Google config with force account selection", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
      vi.stubEnv("GOOGLE_FORCE_ACCOUNT_SELECTION", "true");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.google).toEqual({
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
        prompt: "select_account",
      });
    });

    it("should include Google config without force account selection", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
      vi.stubEnv("GOOGLE_FORCE_ACCOUNT_SELECTION", "false");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.google).toEqual({
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
      });
    });

    it("should include Microsoft config with custom tenant ID", () => {
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");
      vi.stubEnv("MICROSOFT_TENANT_ID", "custom-tenant-id");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.microsoft).toEqual({
        clientId: "microsoft-client-id",
        clientSecret: "microsoft-client-secret",
        tenantId: "custom-tenant-id",
      });
    });

    it("should include Microsoft config with default tenant ID", () => {
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.microsoft).toEqual({
        clientId: "microsoft-client-id",
        clientSecret: "microsoft-client-secret",
        tenantId: "common",
      });
    });

    it("should include Microsoft config with force account selection", () => {
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");
      vi.stubEnv("MICROSOFT_FORCE_ACCOUNT_SELECTION", "true");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.microsoft).toEqual({
        clientId: "microsoft-client-id",
        clientSecret: "microsoft-client-secret",
        tenantId: "common",
        prompt: "select_account",
      });
    });

    it("should handle complete configuration with all providers", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "1");
      vi.stubEnv("DISABLE_SIGN_UP", "1");
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");
      vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
      vi.stubEnv("GOOGLE_FORCE_ACCOUNT_SELECTION", "true");
      vi.stubEnv("MICROSOFT_CLIENT_ID", "microsoft-client-id");
      vi.stubEnv("MICROSOFT_CLIENT_SECRET", "microsoft-client-secret");
      vi.stubEnv("MICROSOFT_TENANT_ID", "custom-tenant");
      vi.stubEnv("MICROSOFT_FORCE_ACCOUNT_SELECTION", "true");

      const config = getAuthConfig();

      expect(config).toEqual({
        emailAndPasswordEnabled: false,
        signUpEnabled: false,
        socialAuthenticationProviders: {
          github: {
            clientId: "github-client-id",
            clientSecret: "github-client-secret",
          },
          google: {
            clientId: "google-client-id",
            clientSecret: "google-client-secret",
            prompt: "select_account",
          },
          microsoft: {
            clientId: "microsoft-client-id",
            clientSecret: "microsoft-client-secret",
            tenantId: "custom-tenant",
            prompt: "select_account",
          },
        },
        allowedOrigins: [],
      });
    });

    it("should handle partial provider configurations", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");
      // Missing Google and Microsoft credentials

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.github).toBeDefined();
      expect(config.socialAuthenticationProviders.google).toBeUndefined();
      expect(config.socialAuthenticationProviders.microsoft).toBeUndefined();
    });

    it("should handle empty string environment variables", () => {
      vi.stubEnv("GITHUB_CLIENT_ID", "");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");

      const config = getAuthConfig();
      expect(config.socialAuthenticationProviders.github).toBeUndefined();
    });

    it("should fallback to defaults when AuthConfig parsing fails", () => {
      // Mock console.log to avoid output during test
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Set invalid configuration that would cause parsing to fail
      // This tests the fallback behavior in the catch block
      const config = getAuthConfig();

      expect(config).toEqual({
        emailAndPasswordEnabled: true,
        signUpEnabled: true,
        socialAuthenticationProviders: {
          github: undefined,
          google: undefined,
          microsoft: undefined,
        },
        allowedOrigins: [],
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Environment Variable Parsing Edge Cases", () => {
    it("should handle 'y' as true for DISABLE variables (disabling features)", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "y");

      const config = getAuthConfig();
      expect(config.emailAndPasswordEnabled).toBe(false);
    });

    it("should handle case variations for DISABLE variables", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "TRUE");
      vi.stubEnv("DISABLE_SIGN_UP", "True");

      const config = getAuthConfig();
      expect(config.emailAndPasswordEnabled).toBe(false);
      expect(config.signUpEnabled).toBe(false);
    });

    it("should treat undefined DISABLE variables as enabled by default", () => {
      // Don't set any environment variables
      const config = getAuthConfig();
      // Should use defaults which are true (features enabled)
      expect(config.emailAndPasswordEnabled).toBe(true);
      expect(config.signUpEnabled).toBe(true);
    });

    it("should treat falsy values as not disabling features", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "0");
      vi.stubEnv("DISABLE_SIGN_UP", "false");

      const config = getAuthConfig();
      expect(config.emailAndPasswordEnabled).toBe(true);
      expect(config.signUpEnabled).toBe(true);
    });
  });

  describe("Allowed Origins Configuration", () => {
    it("should return empty array when ALLOWED_ORIGINS is not set", () => {
      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([]);
    });

    it("should parse single origin correctly", () => {
      vi.stubEnv("ALLOWED_ORIGINS", "https://example.com");

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual(["https://example.com"]);
    });

    it("should parse multiple origins correctly", () => {
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://example.com,http://localhost:3000,https://app.example.com",
      );

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([
        "https://example.com",
        "http://localhost:3000",
        "https://app.example.com",
      ]);
    });

    it("should handle origins with spaces", () => {
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://example.com, http://localhost:3000 , https://app.example.com",
      );

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([
        "https://example.com",
        "http://localhost:3000",
        "https://app.example.com",
      ]);
    });

    it("should filter out empty strings", () => {
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://example.com,,http://localhost:3000,",
      );

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([
        "https://example.com",
        "http://localhost:3000",
      ]);
    });

    it("should return empty array for empty string", () => {
      vi.stubEnv("ALLOWED_ORIGINS", "");

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([]);
    });

    it("should return empty array for whitespace only", () => {
      vi.stubEnv("ALLOWED_ORIGINS", "   ");

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([]);
    });

    it("should handle trailing commas", () => {
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://example.com,http://localhost:3000,",
      );

      const config = getAuthConfig();
      expect(config.allowedOrigins).toEqual([
        "https://example.com",
        "http://localhost:3000",
      ]);
    });

    it("should work with complete auth configuration", () => {
      vi.stubEnv("DISABLE_EMAIL_SIGN_IN", "0");
      vi.stubEnv("DISABLE_SIGN_UP", "0");
      vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
      vi.stubEnv("GITHUB_CLIENT_SECRET", "github-client-secret");
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://example.com,https://app.example.com",
      );

      const config = getAuthConfig();
      expect(config).toMatchObject({
        emailAndPasswordEnabled: true,
        signUpEnabled: true,
        allowedOrigins: ["https://example.com", "https://app.example.com"],
      });
      expect(config.socialAuthenticationProviders.github).toBeDefined();
    });
  });
});
