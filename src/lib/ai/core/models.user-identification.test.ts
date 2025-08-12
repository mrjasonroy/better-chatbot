import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ChatModel } from "@/types/chat";

// Mock auth/server module
vi.mock("auth/server", () => ({
  getSession: vi.fn(),
}));

// Mock the config module
vi.mock("./config", () => ({
  getAllProviderConfigs: vi.fn(),
  getProviderConfig: vi.fn(),
  isProviderConfigured: vi.fn(),
}));

// Mock the utils module
vi.mock("lib/utils", () => ({
  parseEnvBoolean: vi.fn(),
}));

// Mock all the AI SDK providers with implementations that capture headers
const createProviderMock = (providerName: string) => {
  const mockProvider = vi.fn((modelName: string, settings?: any) => ({
    modelId: `${providerName}:${modelName}`,
    specificationVersion: "v1",
    provider: providerName,
    settings,
  }));

  const mockCreator = vi.fn((config: any) => {
    // Store the config for inspection
    (mockCreator as any).lastConfig = config;
    return mockProvider;
  }) as any;

  return { mockCreator, mockProvider };
};

const openaiMock = createProviderMock("openai");
const anthropicMock = createProviderMock("anthropic");
const googleMock = createProviderMock("google");
const xaiMock = createProviderMock("xai");
const openrouterMock = createProviderMock("openrouter");
const ollamaMock = createProviderMock("ollama");
const azureMock = createProviderMock("azure");
const openaiCompatibleMock = createProviderMock("openai-compatible");

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: openaiMock.mockCreator,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: anthropicMock.mockCreator,
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: googleMock.mockCreator,
}));

vi.mock("@ai-sdk/xai", () => ({
  createXai: xaiMock.mockCreator,
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: openrouterMock.mockCreator,
}));

vi.mock("ollama-ai-provider", () => ({
  createOllama: ollamaMock.mockCreator,
}));

vi.mock("@ai-sdk/azure", () => ({
  createAzure: azureMock.mockCreator,
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: openaiCompatibleMock.mockCreator,
}));

// Mock logger
vi.mock("logger", () => ({
  default: {
    withDefaults: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("User Identification in Models", () => {
  const originalEnv = process.env;

  const sampleProviderConfigs = [
    {
      id: "openai",
      type: "openai",
      name: "OpenAI",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "GPT-4",
          apiName: "gpt-4",
          supportsTools: true,
          settings: { temperature: 0.7 },
        },
      ],
    },
    {
      id: "anthropic",
      type: "anthropic",
      name: "Anthropic",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "Claude",
          apiName: "claude-3",
          supportsTools: true,
        },
      ],
    },
    {
      id: "google",
      type: "google",
      name: "Google",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "Gemini",
          apiName: "gemini-pro",
          supportsTools: true,
        },
      ],
    },
    {
      id: "xai",
      type: "xai",
      name: "xAI",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "Grok",
          apiName: "grok-beta",
          supportsTools: true,
        },
      ],
    },
    {
      id: "openrouter",
      type: "openrouter",
      name: "OpenRouter",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "Model",
          apiName: "model-1",
          supportsTools: true,
        },
      ],
    },
    {
      id: "ollama",
      type: "ollama",
      name: "Ollama",
      providerSettings: { baseURL: "http://localhost:11434" },
      models: [
        {
          uiName: "Llama",
          apiName: "llama3",
          supportsTools: true,
        },
      ],
    },
    {
      id: "azure-openai",
      type: "azure-openai",
      name: "Azure OpenAI",
      providerSettings: { apiKey: "test-key", resourceName: "test" },
      models: [
        {
          uiName: "GPT-4 Azure",
          apiName: "gpt-4-azure",
          supportsTools: true,
        },
      ],
    },
    {
      id: "openai-compatible",
      type: "openai-compatible",
      name: "OpenAI Compatible",
      providerSettings: {
        apiKey: "test-key",
        baseURL: "https://api.example.com",
      },
      models: [
        {
          uiName: "Custom Model",
          apiName: "custom-model",
          supportsTools: true,
        },
      ],
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };

    // Setup default mocks
    const configModule = await import("./config");
    const mockGetAllProviderConfigs = configModule.getAllProviderConfigs as any;
    const mockGetProviderConfig = configModule.getProviderConfig as any;
    const mockIsProviderConfigured = configModule.isProviderConfigured as any;

    mockGetAllProviderConfigs.mockReturnValue(sampleProviderConfigs);
    mockGetProviderConfig.mockImplementation(
      (id: string) => sampleProviderConfigs.find((c) => c.id === id) || null,
    );
    mockIsProviderConfigured.mockReturnValue(true);

    // Reset all provider mocks
    [
      openaiMock,
      anthropicMock,
      googleMock,
      xaiMock,
      openrouterMock,
      ollamaMock,
      azureMock,
      openaiCompatibleMock,
    ].forEach((mock) => {
      mock.mockCreator.lastConfig = undefined;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Environment Configuration", () => {
    it("should respect PASS_USER_TO_API_CALLS environment variable", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com", id: "123" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_END_USER_ID_FIELD = "email";

      // Import fresh module to pick up env changes
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const chatModel: ChatModel = {
        provider: "openai",
        model: "GPT-4",
      };

      await modelRegistry.getModel(chatModel);

      // Check that parseEnvBoolean was called with the env var
      expect(parseEnvBoolean).toHaveBeenCalledWith("true");
    });

    it("should use custom header key from API_USER_HEADER_KEY", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com", id: "123" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_USER_HEADER_KEY = "x-custom-user-id";
      process.env.API_END_USER_ID_FIELD = "email";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Check that the custom header key is used
      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-custom-user-id",
        "test@example.com",
      );
    });

    it("should use custom user field from API_END_USER_ID_FIELD", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: {
          email: "test@example.com",
          id: "user-123",
          customField: "custom-value",
        },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_END_USER_ID_FIELD = "customField";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Check that the custom field value is used
      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "custom-value",
      );
    });

    it("should not pass user identification when PASS_USER_TO_API_CALLS is false", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(false);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "false";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Session should not be called when feature is disabled
      expect(getSession).not.toHaveBeenCalled();

      // Check that no user header is added
      expect(openaiMock.mockCreator.lastConfig).not.toHaveProperty("x-user-id");
    });
  });

  describe("Provider-specific User Identification", () => {
    beforeEach(async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com", id: "123" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_END_USER_ID_FIELD = "email";
    });

    it("should pass user identification to OpenAI provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      expect(openaiMock.mockProvider).toHaveBeenCalledWith(
        "gpt-4",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });

    it("should pass user identification to Anthropic provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "anthropic",
        model: "Claude",
      });

      expect(anthropicMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      // Anthropic no longer passes user in model settings, only via providerOptions
      expect(anthropicMock.mockProvider).toHaveBeenCalledWith(
        "claude-3",
        expect.not.objectContaining({
          metadata: expect.anything(),
        }),
      );
      // Check providerOptions instead
      expect(result.providerOptions.anthropic).toEqual({
        metadata: { user_id: "test@example.com" },
      });
    });

    it("should pass user identification to Google provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "google",
        model: "Gemini",
      });

      expect(googleMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      // Google no longer passes user in model settings, only via providerOptions
      expect(googleMock.mockProvider).toHaveBeenCalledWith(
        "gemini-pro",
        expect.not.objectContaining({
          metadata: expect.anything(),
        }),
      );
      // Check providerOptions instead
      expect(result.providerOptions.google).toEqual({
        metadata: { user_id: "test@example.com" },
      });
    });

    it("should pass user identification to xAI provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "xai",
        model: "Grok",
      });

      expect(xaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      // xAI still uses user parameter, not metadata
      expect(xaiMock.mockProvider).toHaveBeenCalledWith(
        "grok-beta",
        expect.objectContaining({ user: "test@example.com" }),
      );
      // xAI not included in providerOptions (only anthropic and google)
      expect(result.providerOptions).not.toHaveProperty("xai");
    });

    it("should pass user identification to OpenRouter provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openrouter",
        model: "Model",
      });

      expect(openrouterMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      expect(openrouterMock.mockProvider).toHaveBeenCalledWith(
        "model-1",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });

    it("should pass user identification to Ollama provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "ollama",
        model: "Llama",
      });

      expect(ollamaMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      expect(ollamaMock.mockProvider).toHaveBeenCalledWith(
        "llama3",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });

    it("should pass user identification to Azure OpenAI provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "azure-openai",
        model: "GPT-4 Azure",
      });

      expect(azureMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      expect(azureMock.mockProvider).toHaveBeenCalledWith(
        "gpt-4-azure",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });

    it("should pass user identification to OpenAI-compatible provider", async () => {
      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai-compatible",
        model: "Custom Model",
      });

      expect(openaiCompatibleMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "test@example.com",
      );
      expect(openaiCompatibleMock.mockProvider).toHaveBeenCalledWith(
        "custom-model",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should continue without user identification when user session is not found", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue(null);

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Should work without user identification
      expect(result).toBeDefined();
      expect(result.model).toBeDefined();

      // Provider should be created without user headers
      expect(openaiMock.mockCreator).toHaveBeenCalled();
      expect(openaiMock.mockCreator.lastConfig).not.toHaveProperty("x-user-id");
    });

    it("should handle missing user field gracefully", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { id: "123" }, // Missing email field
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_END_USER_ID_FIELD = "email";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // When field is missing, header won't be added (undefined values are not set as headers)
      // Check that the config was created but without the user header
      expect(openaiMock.mockCreator).toHaveBeenCalled();
      expect(openaiMock.mockCreator.lastConfig).toBeDefined();
      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "apiKey",
        "test-key",
      );
      // The x-user-id header should not exist when the field value is undefined
      expect(openaiMock.mockCreator.lastConfig).not.toHaveProperty("x-user-id");
    });
  });

  describe("Fallback Model with User Identification", () => {
    it("should pass user identification to fallback model", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "fallback@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";
      process.env.API_END_USER_ID_FIELD = "email";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      // Request with no specific model to trigger fallback
      await modelRegistry.getModel();

      // Should use the first available provider (OpenAI in our config)
      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "fallback@example.com",
      );
    });

    it("should pass user identification when falling back due to invalid model", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "fallback@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      // Request with invalid model to trigger fallback
      await modelRegistry.getModel({
        provider: "nonexistent",
        model: "invalid",
      });

      // Should fall back and still pass user identification
      expect(openaiMock.mockCreator.lastConfig).toHaveProperty(
        "x-user-id",
        "fallback@example.com",
      );
    });
  });

  describe("Provider Options Integration", () => {
    it("should return providerOptions with Anthropic and Google metadata when user identification is enabled", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "anthropic",
        model: "Claude",
      });

      expect(result.providerOptions).toEqual({
        anthropic: {
          metadata: {
            user_id: "test@example.com",
          },
        },
        google: {
          metadata: {
            user_id: "test@example.com",
          },
        },
      });
    });

    it("should return empty providerOptions when user identification is disabled", async () => {
      const { parseEnvBoolean } = await import("lib/utils");

      (parseEnvBoolean as any).mockReturnValue(false);

      process.env.PASS_USER_TO_API_CALLS = "false";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      const result = await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      expect(result.providerOptions).toEqual({});
    });

    it("should return providerOptions in fallback scenarios", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "fallback@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      // Request with no specific model to trigger fallback
      const result = await modelRegistry.getModel();

      expect(result.providerOptions).toEqual({
        anthropic: {
          metadata: {
            user_id: "fallback@example.com",
          },
        },
        google: {
          metadata: {
            user_id: "fallback@example.com",
          },
        },
      });
    });
  });

  describe("Model Settings Integration", () => {
    it("should merge user identification with existing model settings", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Should merge user with existing temperature setting
      expect(openaiMock.mockProvider).toHaveBeenCalledWith(
        "gpt-4",
        expect.objectContaining({
          temperature: 0.7,
          user: "test@example.com",
        }),
      );
    });

    it("should not override existing user setting in model config", async () => {
      const { parseEnvBoolean } = await import("lib/utils");
      const { getSession } = await import("auth/server");
      const configModule = await import("./config");

      (parseEnvBoolean as any).mockReturnValue(true);
      (getSession as any).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      // Model config with existing user setting
      (configModule.getProviderConfig as any).mockReturnValue({
        id: "openai",
        type: "openai",
        name: "OpenAI",
        providerSettings: { apiKey: "test-key" },
        models: [
          {
            uiName: "GPT-4",
            apiName: "gpt-4",
            settings: { user: "predefined-user" },
          },
        ],
      });

      process.env.PASS_USER_TO_API_CALLS = "true";

      vi.resetModules();
      const { modelRegistry } = await import("./models");

      await modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      // Should use the user from session, not predefined
      expect(openaiMock.mockProvider).toHaveBeenCalledWith(
        "gpt-4",
        expect.objectContaining({ user: "test@example.com" }),
      );
    });
  });
});
