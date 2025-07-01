import { PipelineContext } from "../lib/types";

export const needsMoreContext = (ctx: PipelineContext) =>
  ctx.intent?.needsMoreContext || false;

export const hasFileChanges = (ctx: PipelineContext) =>
  ctx.intent?.hasFileChanges || false;
