import { z } from "zod";
import { IntentSchema, ChangeSchema, ChangesSchema } from "./schemas";

export interface FileContext {
  path: string;
  language?: "typescript" | "javascript" | "tsx" | "jsx";
  content?: string;
  ast?: SemanticInfo;
}

export interface SemanticInfo {
  imports: Array<{ source: string; specifiers: string[] }>;
  exports: Array<{ name: string; type: string }>;
  functions: Array<{ name: string; params: string[]; line: number }>;
  classes: Array<{ name: string; methods: string[]; line: number }>;
  dependencies: Set<string>;
}

export type Intent = z.infer<typeof IntentSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type Changes = z.infer<typeof ChangesSchema>;

export interface PipelineContext {
  userPrompt: string;
  files: FileContext[];
  projectRoot: string;
  projectTree?: string;
  intent: Intent;
  changes: Change[];
  result: {
    modifiedFiles: string[];
    deletedFiles: string[];
    createdFiles: string[];
  };
}

export type PipelineStep<T> = (context: T) => Promise<T>;
export type Condition<T> = (context: T) => boolean;
export type PipelineStepDefinition<T> =
  | PipelineStep<T>
  | [Condition<T>, PipelineStep<T>]
  | { when: Condition<T>; steps: PipelineStep<T>[] };
