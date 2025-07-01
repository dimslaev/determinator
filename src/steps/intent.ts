import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";

export const analyzeIntent: PipelineStep<PipelineContext> = async (ctx) => {
  console.log(
    `Analyzing intent for prompt: "${ctx.userPrompt.slice(0, 50)}..."`
  );

  if (!ctx.projectTree) {
    throw new Error("Missing project tree");
  }

  ctx.intent = await AI.analyzeIntent(
    ctx.userPrompt,
    ctx.files,
    ctx.projectTree
  );

  console.log(
    `✓ Intent analyzed - needsMoreContext: ${ctx.intent.needsMoreContext}`
  );
  return ctx;
};
