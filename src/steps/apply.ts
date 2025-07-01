import { AI } from "../services/ai";
import { PipelineStep, PipelineContext, Change } from "../lib/types";
import {
  safeWriteFile,
  safeDeleteFile,
  readFile,
  resolveFilePath,
} from "../lib/utils";

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
        try {
          await safeDeleteFile(filePath, ctx.projectRoot);
          ctx.result.deletedFiles.push(filePath);
          console.log("File deleted successfully:", filePath);
        } catch (error) {
          console.error("Error deleting file:", error);
        }
        return;
      }

      let fileContent = "";

      if (changes[0].operation !== "new_file") {
        fileContent = await readFile(
          resolveFilePath(filePath, ctx.projectRoot)
        );

        if (!fileContent) {
          throw new Error(`Could not read file ${filePath}`);
        }
      }

      const newFileContent = await AI.applyFileChanges(changes, fileContent);

      try {
        await safeWriteFile(filePath, newFileContent, ctx.projectRoot);
        if (changes[0].operation === "new_file") {
          ctx.result.createdFiles.push(filePath);
        } else {
          ctx.result.modifiedFiles.push(filePath);
        }
        console.log("File written successfully:", filePath);
      } catch (error) {
        console.error("Error writing file:", error);
        throw error; // Re-throw to properly handle the error
      }
    })
  );

  return ctx;
};
