import { PipelineContext } from "../lib/types";

export const needsMoreContext = (ctx: PipelineContext) =>
  ctx.intent?.needsMoreContext || false;

export const isAskMode = (ctx: PipelineContext) => ctx.intent?.mode === "ask";

export const isEditMode = (ctx: PipelineContext) => ctx.intent?.mode === "edit";
