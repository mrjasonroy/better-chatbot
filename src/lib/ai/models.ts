import "server-only";

// import { google } from "@ai-sdk/google";
// import { createAnthropic } from "@ai-sdk/anthropic";
// import { createOpenAI } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

// const anthropic = createAnthropic({
//   baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// const openai = createOpenAI({
//   baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
//   apiKey: process.env.OPENAI_API_KEY,
// });

const staticModels = {
  // anthropic: {
  //   "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
  //   "claude-4-opus": anthropic("claude-4-opus-20250514"),
  //   "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-20250219"),
  // },
  // openai: {
  //   "gpt-4.1": openai("gpt-4.1"),
  //   "gpt-4.1-mini": openai("gpt-4.1-mini"),
  //   "o4-mini": openai("o4-mini"),
  //   o3: openai("o3"),
  //   "gpt-5": openai("gpt-5"),
  //   "gpt-5-mini": openai("gpt-5-mini"),
  //   "gpt-5-nano": openai("gpt-5-nano"),
  // },
  // google: {
  //   "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
  //   "gemini-2.5-flash": google("gemini-2.5-flash"),
  //   "gemini-2.5-pro": google("gemini-2.5-pro"),
  // },

  openRouter: {
    "anthropic/claude-sonnet-4.5": openrouter("anthropic/claude-sonnet-4.5"),
    "anthropic/claude-3.5-haiku": openrouter("anthropic/claude-3.5-haiku"),
    "anthropic/claude-opus-4.1": openrouter("anthropic/claude-opus-4.1"),
    "openai/gpt-5": openrouter("openai/gpt-5"),
    "openai/gpt-5-mini": openrouter("openai/gpt-5-mini"),
    "openai/o4-mini": openrouter("openai/o4-mini"),
    "openai/o3": openrouter("openai/o3"),
    "google/gemini-2.5-flash": openrouter("google/gemini-2.5-flash"),
    "google/gemini-2.5-pro": openrouter("google/gemini-2.5-pro"),
    "deepseek/deepseek-chat-v3": openrouter("deepseek/deepseek-chat-v3-0324"),
    "meta-llama/llama-3.3": openrouter("meta-llama/llama-3.3-70b-instruct"),
  },
};

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([...openaiCompatibleUnsupportedModels]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const staticSupportImageInputModels = {
  "openai/gpt-5": openrouter("openai/gpt-5"),
  "openai/gpt-5-mini": openrouter("openai/gpt-5-mini"),
  "openai/o4-mini": openrouter("openai/o4-mini"),
  "openai/o3": openrouter("openai/o3"),
};

const isImageInputUnsupportedModel = (
  model: (typeof staticSupportImageInputModels)[keyof typeof staticSupportImageInputModels],
) => {
  return !Object.values(staticSupportImageInputModels).includes(model);
};

const fallbackModel = staticModels.openRouter["openai/gpt-5"];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
      isImageInputUnsupported: isImageInputUnsupportedModel(model),
    })),
    hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return allModels[model.provider]?.[model.model] || fallbackModel;
  },
};

function checkProviderAPIKey(provider: keyof typeof staticModels) {
  let key: string | undefined;
  switch (provider) {
    // case "openai":
    //   key = process.env.OPENAI_API_KEY;
    //   break;
    // case "google":
    //   key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    //   break;
    // case "anthropic":
    //   key = process.env.ANTHROPIC_API_KEY;
    //   break;
    // case "xai":
    //   key = process.env.XAI_API_KEY;
    //   break;
    // case "ollama":
    //   key = process.env.OLLAMA_API_KEY;
    //   break;
    // case "groq":
    //   key = process.env.GROQ_API_KEY;
    //   break;
    case "openRouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key != "****";
}
