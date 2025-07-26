import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const generateChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before generating changes"
    );
  }

  Logger.info("Generating changes ...");

  ctx.changes = await AI.generateChanges(ctx.intent, ctx.files);

  Logger.debug(`✓ Generated ${ctx.changes.length} changes`);
  return ctx;
};
