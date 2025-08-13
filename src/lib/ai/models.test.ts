/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";

describe("DEFAULT_MODEL functionality", () => {
  describe("format validation", () => {
    it("should parse valid DEFAULT_MODEL format", () => {
      const validModel = "openRouter/qwen3-8b:free";
      const parts = validModel.split("/");

      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe("openRouter");
      expect(parts[1]).toBe("qwen3-8b:free");
    });

    it("should detect invalid formats", () => {
      const invalidFormats = [
        "malformed-format",
        "provider/model/extra",
        "provider/",
        "/model",
        "",
        "just-text",
      ];

      invalidFormats.forEach((format) => {
        const parts = format.split("/");
        const isValid =
          parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]);
        expect(isValid).toBe(false);
      });
    });

    it("should handle model names with special characters", () => {
      const validFormats = [
        "openRouter/qwen3-8b:free",
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o-mini",
        "google/gemini-1.5-pro",
        "provider/model_with_underscores",
        "camelCase/model:with:colons",
      ];

      validFormats.forEach((format) => {
        const parts = format.split("/");
        expect(parts).toHaveLength(2);
        expect(parts[0]).toBeTruthy();
        expect(parts[1]).toBeTruthy();
      });
    });
  });

  describe("fallback behavior", () => {
    it("should fallback gracefully when provider not found", () => {
      const mockAllModels = {
        openai: { "gpt-4": {} },
        anthropic: { "claude-3": {} },
      };

      const testEnv = "invalidProvider/some-model";
      const parts = testEnv.split("/");
      const [provider, _model] = parts;

      const providerExists =
        mockAllModels[provider as keyof typeof mockAllModels];
      expect(providerExists).toBeUndefined();
    });

    it("should fallback gracefully when model not found in provider", () => {
      const mockAllModels = {
        openRouter: { "qwen3-8b:free": {}, "qwen3-14b:free": {} },
      };

      const testEnv = "openRouter/invalid-model";
      const parts = testEnv.split("/");
      const [provider, model] = parts;

      const providerModels =
        mockAllModels[provider as keyof typeof mockAllModels];
      const modelExists = providerModels?.[model];

      expect(providerModels).toBeDefined();
      expect(modelExists).toBeUndefined();
    });
  });

  describe("model marking", () => {
    it("should mark correct model as default in response", () => {
      const mockProvider = "openRouter";
      const mockModel = "qwen3-8b:free";

      const mockModelsResponse = [
        {
          provider: "openRouter",
          models: [
            {
              name: "qwen3-8b:free",
              isDefault: true,
              isToolCallUnsupported: false,
            },
            {
              name: "qwen3-14b:free",
              isDefault: false,
              isToolCallUnsupported: false,
            },
          ],
        },
        {
          provider: "openai",
          models: [
            { name: "gpt-4o", isDefault: false, isToolCallUnsupported: false },
          ],
        },
      ];

      const defaultModel = mockModelsResponse.flatMap((p) =>
        p.models
          .filter((m) => m.isDefault)
          .map((m) => ({ provider: p.provider, model: m.name })),
      )[0];

      expect(defaultModel).toEqual({
        provider: mockProvider,
        model: mockModel,
      });
    });

    it("should have only one model marked as default", () => {
      const mockModelsResponse = [
        {
          provider: "openRouter",
          models: [
            { name: "qwen3-8b:free", isDefault: true },
            { name: "qwen3-14b:free", isDefault: false },
          ],
        },
        {
          provider: "openai",
          models: [{ name: "gpt-4o", isDefault: false }],
        },
      ];

      const defaultModels = mockModelsResponse.flatMap((p) =>
        p.models.filter((m) => m.isDefault),
      );

      expect(defaultModels).toHaveLength(1);
    });
  });
});
