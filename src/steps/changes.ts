import { AI } from "../services/ai";
import { PipelineStep, PipelineContext } from "../lib/types";

export const generateChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent || !ctx.projectTree) {
    throw new Error(
      "Intent analysis must be completed before generating changes"
    );
  }

  ctx.changes = await AI.generateChanges(
    ctx.userPrompt,
    ctx.intent,
    ctx.files,
    ctx.projectTree
  );

  console.log(`✓ Generated ${ctx.changes.length} changes`);
  return ctx;
};
