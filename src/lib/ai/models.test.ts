import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILE_PART_MIME_TYPES } from "./file-support";

vi.mock("server-only", () => ({}));

let modelsModule: typeof import("./models");

beforeAll(async () => {
  modelsModule = await import("./models");
});

describe("customModelProvider file support metadata", () => {
  it("includes default file support for OpenAI gpt-4.1", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "openai",
      model: "gpt-4.1",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(DEFAULT_FILE_PART_MIME_TYPES),
    );

    const openaiProvider = customModelProvider.modelsInfo.find(
      (item) => item.provider === "openai",
    );
    const metadata = openaiProvider?.models.find(
      (item) => item.name === "gpt-4.1",
    );

    expect(metadata?.supportedFileMimeTypes).toEqual(
      Array.from(DEFAULT_FILE_PART_MIME_TYPES),
    );
  });

  it("marks non-file-capable providers with empty mime support", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "google",
      model: "gemini-2.5-flash",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual([]);

    const provider = customModelProvider.modelsInfo.find(
      (item) => item.provider === "google",
    );
    const metadata = provider?.models.find(
      (item) => item.name === "gemini-2.5-flash",
    );

    expect(metadata?.supportedFileMimeTypes).toEqual([]);
  });
});
