import { AST } from "../services/ast";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const parseAST: PipelineStep<PipelineContext> = async (ctx) => {
  Logger.debug(`Analyzing semantics for ${ctx.files.length} files...`);

  ctx.files = await Promise.all(
    ctx.files.map(async (file) => {
      if (file.ast) return file;
      return {
        ...file,
        ast: await AST.parseFile(file),
      };
    })
  );

  Logger.debug(`✓ Parsed ${ctx.files.length} files`);
  return ctx;
};
