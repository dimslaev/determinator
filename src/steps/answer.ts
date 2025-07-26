import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const generateAnswer: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before generating answer"
    );
  }

  Logger.info("Generating answer ...");

  ctx.answer = await AI.generateAnswer(ctx.intent, ctx.files);

  Logger.info(ctx.answer);

  return ctx;
};
