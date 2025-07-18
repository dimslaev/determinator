import { PipelineStep, PipelineContext } from "../lib/types";
import {
  detectLanguage,
  readFile,
  resolveFilePath,
  fileExists,
} from "../lib/utils";
import { Logger } from "../services/logger";

export const readFiles: PipelineStep<PipelineContext> = async (ctx) => {
  const results = await Promise.allSettled(
    ctx.files.map(async (file) => {
      if (file.content) return file;

      // Resolve file path relative to project root
      const resolvedPath = resolveFilePath(file.path, ctx.projectRoot);

      // Check if file exists first
      if (!(await fileExists(resolvedPath))) {
        Logger.warn(`File not found, skipping: ${file.path}`);
        return null;
      }

      return {
        ...file,
        path: resolvedPath, // Update path to resolved path
        content: await readFile(resolvedPath),
        language: detectLanguage(resolvedPath),
      };
    })
  );

  ctx.files = results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((file) => file !== null);

  return ctx;
};
