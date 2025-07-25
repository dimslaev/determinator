import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const analyzeIntent: PipelineStep<PipelineContext> = async (ctx) => {
  Logger.info(
    `Analyzing intent for prompt: "${ctx.userPrompt.slice(0, 50)}..."`
  );

  ctx.intent = await AI.analyzeIntent(
    ctx.userPrompt,
    ctx.files,
    ctx.projectTree
  );

  Logger.info(`✓ Intent analyzed\n`, ctx.intent.description);
  return ctx;
};
