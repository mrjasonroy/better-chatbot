import { tool as createTool } from "ai";
import { serverFileStorage } from "lib/file-storage";
import z from "zod";
import { FileGeneratorToolName } from "..";
import logger from "logger";

export type FileGeneratorToolResult = {
  files: {
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  description?: string;
};

export const fileGeneratorTool = createTool({
  name: FileGeneratorToolName,
  description: `Create and save files with specified content. Use this tool when the user requests downloadable files such as:
- Data files: CSV, JSON, XML, YAML
- Documents: Markdown, text files, configuration files
- Code files: Python, JavaScript, HTML, CSS, etc.
- Structured data exports

The tool will generate the file, upload it to storage, and provide a download link. Do not use this for images (use image-manager instead) or for simple text responses that don't need to be downloaded.`,
  inputSchema: z.object({
    files: z
      .array(
        z.object({
          filename: z
            .string()
            .describe(
              "The name of the file including extension (e.g., data.csv, script.py)",
            ),
          content: z.string().describe("The complete content of the file"),
          mimeType: z
            .string()
            .optional()
            .describe(
              "MIME type (e.g., 'text/csv', 'application/json', 'text/plain'). If not provided, will be inferred from filename.",
            ),
        }),
      )
      .min(1)
      .max(5)
      .describe("Array of files to generate (1-5 files)"),
    description: z
      .string()
      .optional()
      .describe(
        "Optional description of what the files contain or how to use them",
      ),
  }),
  execute: async ({ files, description }) => {
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          // Convert content to Buffer
          const buffer = Buffer.from(file.content, "utf-8");

          // Infer MIME type from filename if not provided
          let mimeType = file.mimeType;
          if (!mimeType) {
            const extension = file.filename.split(".").pop()?.toLowerCase();
            const mimeTypeMap: Record<string, string> = {
              csv: "text/csv",
              json: "application/json",
              xml: "application/xml",
              yaml: "text/yaml",
              yml: "text/yaml",
              txt: "text/plain",
              md: "text/markdown",
              html: "text/html",
              css: "text/css",
              js: "text/javascript",
              ts: "text/typescript",
              py: "text/x-python",
              sh: "application/x-sh",
              sql: "application/sql",
              env: "text/plain",
              log: "text/plain",
            };
            mimeType = mimeTypeMap[extension || ""] || "text/plain";
          }

          // Upload to storage (same pattern as image tool)
          const uploaded = await serverFileStorage.upload(buffer, {
            filename: file.filename,
            contentType: mimeType,
          });

          // Get presigned URL for private buckets if available
          const downloadUrl = serverFileStorage.getDownloadUrl
            ? await serverFileStorage.getDownloadUrl(uploaded.key)
            : uploaded.sourceUrl;

          return {
            url: downloadUrl || uploaded.sourceUrl,
            filename: uploaded.metadata.filename || file.filename,
            mimeType: uploaded.metadata.contentType || mimeType,
            size: uploaded.metadata.size || buffer.length,
          };
        }),
      );

      return {
        files: uploadedFiles,
        description,
      };
    } catch (e) {
      logger.error(e);
      throw new Error(
        "File generation was successful, but file upload failed. Please check your file upload configuration and try again.",
      );
    }
  },
});
