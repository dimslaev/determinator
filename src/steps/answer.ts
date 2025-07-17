import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";

export const generateAnswer: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before generating answer"
    );
  }

  ctx.answer = await AI.generateAnswer(
    ctx.userPrompt,
    ctx.intent,
    ctx.files,
    ctx.projectTree
  );

  console.log(ctx.answer);

  return ctx;
};
