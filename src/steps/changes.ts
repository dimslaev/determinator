import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const prepareChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before preparing changes"
    );
  }

  Logger.info("Preparing change descriptions ...");

  ctx.changeOverviews = await AI.prepareChanges(ctx.intent, ctx.files);

  Logger.debug(
    `✓ Prepared change descriptions for ${ctx.changeOverviews.length} files`
  );
  return ctx;
};

export const generateChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before generating changes"
    );
  }

  if (!ctx.changeOverviews) {
    throw new Error(
      "Change overviews must be prepared before generating changes"
    );
  }

  ctx.changes = [];

  // Generate changes for each file
  for (const overview of ctx.changeOverviews) {
    const file = ctx.files.find((f) => f.path === overview.filePath);
    if (!file) {
      Logger.warn(`File not found: ${overview.filePath}`);
      continue;
    }

    Logger.info(`Generating changes ${file.path}`);
    Logger.info(`Overview: ${overview.overview}`);

    const fileChanges = await AI.generateChangesForFile(
      ctx.intent,
      file,
      overview.overview
    );

    ctx.changes.push(...fileChanges);
  }

  Logger.debug(
    `✓ Generated ${ctx.changes.length} changes across ${ctx.changeOverviews.length} files`
  );
  return ctx;
};
