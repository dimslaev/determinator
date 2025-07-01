import { pipeline } from "./lib/pipeline";
import {
  generateProjectTree,
  readFiles,
  parseAST,
  analyzeIntent,
  discoverFiles,
  needsMoreContext,
  generateChanges,
  applyChanges,
} from "./steps";
import { PipelineContext, Intent } from "./lib/types";
import { hasFileChanges } from "./steps/conditions";

export async function processRequest(
  userPrompt: string,
  initialFilePaths: string[],
  projectRoot: string = process.cwd()
): Promise<{
  intent: Intent;
  result: {
    modifiedFiles: string[];
    deletedFiles: string[];
    createdFiles: string[];
  };
}> {
  console.log(`Processing: "${userPrompt}"`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Initial files: ${initialFilePaths.length}`);

  const initialContext: PipelineContext = {
    userPrompt,
    files: initialFilePaths.map((path) => ({ path })),
    projectRoot,
    intent: {
      scope: "general",
      description: "",
      hasFileChanges: false,
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
    generateProjectTree,
    readFiles,
    parseAST,
    analyzeIntent,
    {
      when: needsMoreContext,
      steps: [discoverFiles, readFiles, parseAST],
    },
    {
      when: hasFileChanges,
      steps: [generateChanges, applyChanges],
    }
  );

  const ctx = await processRequest(initialContext);

  return {
    intent: ctx.intent!,
    result: ctx.result,
  };
}
