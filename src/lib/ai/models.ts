import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGateway } from "@ai-sdk/gateway";

import { LanguageModelV2 } from "@openrouter/ai-sdk-provider";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
} from "./file-support";
import { LanguageModel } from "ai";

// Vercel AI Gateway configuration
const useGateway = !!process.env.VERCEL_AI_GATEWAY_API_KEY;

const gateway = createGateway({
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
});

const anthropic = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

const googleAI = createGoogleGenerativeAI({
  baseURL:
    process.env.GOOGLE_GENERATIVE_AI_BASE_URL || "https://api.google.com/v1",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const deepseek = createDeepSeek({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const meta = createOpenAI({
  baseURL: process.env.META_BASE_URL || "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});

const getGateway = (provider: string, model: string) => {
  if (useGateway) {
    return gateway(`${provider}/${model}`);
  }
  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
    case "google":
      return googleAI(model);
    case "deepseek":
      return deepseek(model);
    case "meta":
      return meta(model);
  }
  throw new Error(`Unsupported provider: ${provider}`);
};

const staticModels = {
  anthropic: {
    "claude-sonnet-4.5": getGateway("anthropic", "claude-sonnet-4.5"),
    "claude-3.5-sonnet": getGateway("anthropic", "claude-3-5-sonnet-20241022"),
    "claude-3.5-haiku": getGateway("anthropic", "claude-3-5-haiku-20241022"),
    "claude-opus-4.1": getGateway("anthropic", "claude-opus-4.1"),
  },
  openai: {
    "gpt-5": getGateway("openai", "gpt-5"),
    "gpt-4.1": getGateway("openai", "gpt-4.1"),
    "gpt-5-mini": getGateway("openai", "gpt-5-mini"),
    "gpt-4o": getGateway("openai", "gpt-4o"),
    "gpt-4o-mini": getGateway("openai", "gpt-4o-mini"),
    "o4-mini": getGateway("openai", "o4-mini"),
    o3: getGateway("openai", "o3"),
    o1: getGateway("openai", "o1"),
    "o1-mini": getGateway("openai", "o1-mini"),
  },
  google: {
    "gemini-2.5-flash": getGateway("google", "gemini-2.5-flash"),
    "gemini-2.5-pro": getGateway("google", "gemini-2.5-pro"),
    "gemini-2.0-flash-exp": getGateway("google", "gemini-2.0-flash-exp"),
    "gemini-1.5-flash": getGateway("google", "gemini-1.5-flash"),
    "gemini-1.5-pro": getGateway("google", "gemini-1.5-pro"),
  },
  deepseek: {
    "deepseek-v3": getGateway("deepseek", "deepseek-v3"),
  },
  meta: {
    "llama-4-maverick": getGateway("meta", "llama-4-maverick"),
    "llama-3.3-70b": getGateway("meta", "llama-3.3-70b"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.openai["o3"],
  staticModels.openai["o1"],
  staticModels.openai["o1-mini"],
]);

const staticSupportImageInputModels = {
  ...staticModels.google,
  ...staticModels.openai,
  ...staticModels.anthropic,
};

const staticFilePartSupportByModel = new Map<
  LanguageModel,
  readonly string[]
>();

const registerFileSupport = (
  model: LanguageModelV2 | undefined,
  mimeTypes: readonly string[] = DEFAULT_FILE_PART_MIME_TYPES,
) => {
  if (!model) return;
  staticFilePartSupportByModel.set(model, Array.from(mimeTypes));
};

registerFileSupport(staticModels.openai["gpt-4.1"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openai["gpt-4.1-mini"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(staticModels.openai["gpt-5"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.openai["gpt-5-mini"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.openai["gpt-5-nano"], OPENAI_FILE_MIME_TYPES);

registerFileSupport(
  staticModels.google["gemini-2.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-pro"],
  GEMINI_FILE_MIME_TYPES,
);

registerFileSupport(
  staticModels.anthropic["sonnet-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.1"],
  ANTHROPIC_FILE_MIME_TYPES,
);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModelV2) => {
  return allUnsupportedModels.has(model);
};

const isImageInputUnsupportedModel = (model: LanguageModelV2) => {
  return !Object.values(staticSupportImageInputModels).includes(model);
};

export const getFilePartSupportedMimeTypes = (model: LanguageModelV2) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

const fallbackModel = staticModels.openai["gpt-4.1"];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
      isImageInputUnsupported: isImageInputUnsupportedModel(model),
      supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
    })),
    hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
  })),
  getModel: (model?: ChatModel): LanguageModelV2 => {
    if (!model) return fallbackModel;
    return allModels[model.provider]?.[model.model] || fallbackModel;
  },
};

function checkProviderAPIKey(provider: keyof typeof staticModels) {
  // If using gateway, check for gateway API key
  if (useGateway) {
    const gatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
    return !!gatewayKey && gatewayKey !== "****";
  }

  // Otherwise check individual provider keys
  let key: string | undefined;
  switch (provider) {
    case "openai":
      key = process.env.OPENAI_API_KEY;
      break;
    case "google":
      key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      break;
    case "anthropic":
      key = process.env.ANTHROPIC_API_KEY;
      break;
    case "deepseek":
      key = process.env.DEEPSEEK_API_KEY;
      break;
    case "meta":
      key = process.env.META_API_KEY;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key !== "****";
}
