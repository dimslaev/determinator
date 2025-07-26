import { PipelineStep, PipelineContext, FileContext } from "../lib/types";
import { Logger } from "../services/logger";
import { AI } from "../services/ai";

export const extractRelevantCodeBlocks: PipelineStep<PipelineContext> = async (
  ctx
) => {
  if (!ctx.intent || ctx.files.length === 0) {
    return ctx;
  }

  Logger.info("Extracting relevant code blocks from files...");

  for (const file of ctx.files) {
    if (!file.content) {
      Logger.warn(`Missing file content during extraction ${file.path}`);
      continue;
    }

    try {
      const relevantBlocks = await AI.extractRelevantCodeBlocks(
        ctx.intent,
        file
      );

      if (relevantBlocks) {
        file.extractedContent = relevantBlocks;
        Logger.info(`Extracted relevant blocks from: ${file.path}`);
      }
    } catch (error) {
      Logger.warn(
        `Failed to extract relevant blocks from ${file.path}: ${error}`
      );
    }
  }

  return ctx;
};
