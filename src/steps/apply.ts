import { AI } from "../services/ai";
import { PipelineStep, PipelineContext, Change } from "../lib/types";
import {
  safeWriteFile,
  safeDeleteFile,
  readFile,
  resolveFilePath,
} from "../lib/utils";
import { Logger } from "../services/logger";

export const applyChanges: PipelineStep<PipelineContext> = async (ctx) => {
  if (!ctx.changes) {
    throw new Error("Changes must be generated before applying");
  }

  const changesPerFile = ctx.changes.reduce((acc, curr) => {
    acc[curr.filePath] = acc[curr.filePath] || [];
    acc[curr.filePath].push(curr);
    return acc;
  }, {} as Record<string, Change[]>);

  const filePaths = Object.keys(changesPerFile);

  await Promise.all(
    filePaths.map(async (filePath) => {
      const changes = changesPerFile[filePath];

      if (changes[0].operation === "delete_file") {
        Logger.info("Deleting file", filePath);

        try {
          await safeDeleteFile(filePath, ctx.projectRoot);
          ctx.result.deletedFiles.push(filePath);
          Logger.debug("File deleted successfully:", filePath);
        } catch (error) {
          Logger.error("Error deleting file:", error);
        }
        return;
      }

      let fileContent = "";

      if (changes[0].operation !== "new_file") {
        Logger.info("Updating file", filePath);

        fileContent = await readFile(
          resolveFilePath(filePath, ctx.projectRoot)
        );

        if (!fileContent) {
          throw new Error(`Could not read file ${filePath}`);
        }
      } else {
        Logger.info("Creating file", filePath);
      }

      const newFileContent = await AI.applyFileChanges(changes, fileContent);

      try {
        await safeWriteFile(filePath, newFileContent, ctx.projectRoot);
        if (changes[0].operation === "new_file") {
          ctx.result.createdFiles.push(filePath);
        } else {
          ctx.result.modifiedFiles.push(filePath);
        }
        Logger.debug("File written successfully:", filePath);
      } catch (error) {
        Logger.error("Error writing file:", error);
        throw error; // Re-throw to properly handle the error
      }
    })
  );

  return ctx;
};
