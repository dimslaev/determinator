import { Discovery } from "../services/discovery";
import { PipelineStep, PipelineContext } from "../lib/types";
import { Logger } from "../services/logger";

export const discoverFiles: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.intent) {
    throw new Error(
      "Intent analysis must be completed before discovering files"
    );
  }

  let discoveredPaths: string[] = [];

  // Discover from explicit paths
  if (ctx.intent.filePaths.length > 0) {
    Logger.debug(
      `Discovering files based on paths \n${ctx.intent.filePaths.join("\n")}`
    );

    const paths = await Discovery.discoverFromPaths(
      ctx.intent.filePaths,
      ctx.files.map((f) => f.path),
      ctx.projectRoot
    );

    discoveredPaths.push(...paths);
  }

  // Discover from search terms
  if (ctx.intent.searchTerms.length > 0) {
    Logger.debug(
      `Discovering files based on search terms \n${ctx.intent.searchTerms.join(
        "\n"
      )}`
    );

    const paths = await Discovery.discoverFromSearchTerms(
      ctx.intent.searchTerms,
      ctx.files.map((f) => f.path),
      ctx.projectRoot
    );

    discoveredPaths.push(...paths);
  }

  // Remove duplicates and paths that already exist in ctx.files
  discoveredPaths = [...new Set(discoveredPaths)].filter(
    (path) => !ctx.files.some((file) => file.path === path)
  );

  ctx.files = [...ctx.files, ...discoveredPaths.map((path) => ({ path }))];

  Logger.info(`✓ Discovered new files \n${discoveredPaths.join("\n")}`);
  return ctx;
};
