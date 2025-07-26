import { pipeline } from "./lib/pipeline";
import { PipelineContext, Intent } from "./lib/types";
import {
  readFiles,
  parseAST,
  analyzeIntent,
  discoverFiles,
  generateChanges,
  writeChanges,
  applyChanges,
  generateAnswer,
} from "./steps";
import { needsMoreContext, isAskMode, isEditMode } from "./steps/conditions";
import { Logger } from "./services/logger";

export async function processRequest(
  userPrompt: string,
  initialFilePaths: string[],
  projectRoot: string = process.cwd(),
  writeOnly: boolean = false
): Promise<{
  intent: Intent;
  answer?: string;
  result: {
    modifiedFiles: string[];
    deletedFiles: string[];
    createdFiles: string[];
  };
}> {
  Logger.info(`Spaider starting ...`);
  Logger.info(`Project root: ${projectRoot}`);
  Logger.info(`Initial files: ${initialFilePaths.length}`);
  Logger.info(`Write-only mode: ${writeOnly}`);

  const initialContext: PipelineContext = {
    userPrompt,
    initialFilePaths,
    files: initialFilePaths.map((path) => ({ path })),
    projectRoot,
    intent: {
      editMode: false,
      description: "",
      needsMoreContext: false,
      filePaths: [],
      searchTerms: [],
    },
    changes: [],
    result: {
      modifiedFiles: [],
      deletedFiles: [],
      createdFiles: [],
    },
  };

  const processRequest = pipeline<PipelineContext>(
    readFiles,
    parseAST,
    analyzeIntent,
    {
      when: needsMoreContext,
      steps: [discoverFiles, readFiles, parseAST],
    },
    {
      when: isAskMode,
      steps: [generateAnswer],
    },
    {
      when: isEditMode,
      steps: writeOnly
        ? [generateChanges, writeChanges]
        : [generateChanges, applyChanges],
    }
  );

  const ctx = await processRequest(initialContext);

  return {
    intent: ctx.intent!,
    answer: ctx.answer,
    result: ctx.result,
  };
}
