import { z } from "zod";

export const IntentSchema = z.object({
  scope: z
    .enum(["current_file", "project_wide", "debugging", "testing", "general"])
    .describe("The scope of the intended operation or analysis"),

  mode: z
    .enum(["ask", "edit"])
    .describe("Whether the user is asking a question or wants to modify files"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description too long")
    .describe("Clear description of what the user wants to accomplish"),

  needsMoreContext: z
    .boolean()
    .describe("Whether additional context or information is needed to proceed"),

  filePaths: z
    .array(z.string())
    .describe("List of file paths relevant to this intent"),

  searchTerms: z
    .array(z.string())
    .describe(
      "Hints or clues that might help in discovering relevant code or files"
    ),
});

export const ChangeSchema = z.object({
  operation: z
    .enum(["new_file", "delete_file", "modify_file"])
    .describe("Type of change operation"),

  filePath: z
    .string()
    .min(1, "File path cannot be empty")
    .describe("Path to the file being modified"),

  modificationType: z
    .enum(["replace_block", "add_block", "remove_block", "none"])
    .describe("Type of change operation"),

  modificationDescription: z
    .string()
    .describe(
      "The description of the modification relative to the code blocks. Leave empty for deleted files."
    ),

  oldCodeBlock: z
    .string()
    .describe(
      "Existing code block to replace. Leave empty for new or deleted files."
    ),

  newCodeBlock: z
    .string()
    .describe("New code block to insert. Leave empty for deleted files."),
});

export const ChangesSchema = z.object({
  changes: z
    .array(ChangeSchema)
    .describe("List of all file changes to be made using hybrid approach"),
});
