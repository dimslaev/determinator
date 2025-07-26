import { PipelineStep, PipelineContext, Change } from "../lib/types";
import { safeWriteFile, formatWriteChanges } from "../lib/utils";
import { Logger } from "../services/logger";

export const writeChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.changes) {
    throw new Error("Changes must be generated before writing to file");
  }

  if (ctx.changes.length === 0) {
    Logger.info("No changes to write to file");
    return ctx;
  }

  const outputFileName = "CHANGES.md";
  const outputPath = outputFileName;

  Logger.info("Writing changes to file", outputPath);

  const changesPerFile = ctx.changes.reduce((acc, curr) => {
    acc[curr.filePath] = acc[curr.filePath] || [];
    acc[curr.filePath].push(curr);
    return acc;
  }, {} as Record<string, Change[]>);

  const formattedFiles = Object.entries(changesPerFile)
    .map(([filePath, fileChanges]) => formatWriteChanges(filePath, fileChanges))
    .join("\n");

  const header = [
    "# Code Changes",
    "Review the changes and apply manually to your codebase.",
    "",
    "---",
    "",
  ].join("\n");

  const fullContent = header + formattedFiles;

  await safeWriteFile(outputPath, fullContent, ctx.projectRoot);

  Logger.info("Changes written successfully to", outputPath);

  ctx.result.createdFiles.push(outputPath);

  return ctx;
};
