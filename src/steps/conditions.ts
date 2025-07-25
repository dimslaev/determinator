import { PipelineContext } from "../lib/types";

export const needsMoreContext = (ctx: PipelineContext) =>
  ctx.intent?.needsMoreContext || false;

export const isEditMode = (ctx: PipelineContext) =>
  ctx.intent?.editMode === true;

export const isAskMode = (ctx: PipelineContext) => !isEditMode(ctx);
