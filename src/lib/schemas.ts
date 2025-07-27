import { z } from "zod";

export const IntentSchema = z.object({
  editMode: z
    .boolean()
    .describe(
      "Set to true if the user's request requires making changes to any files. Set to false if the request is only for information, explanation, or code review."
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description too long")
    .describe("Clear description of what the user wants to accomplish"),

  needsMoreContext: z
    .boolean()
    .describe("Whether additional context is needed to proceed"),

  filePaths: z
    .array(z.string())
    .describe("List of file paths relevant to this intent"),

  searchTerms: z
    .array(z.string())
    .describe("Code symbols that could help discover relevant code or files"),
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

export const ChangeOverviewSchema = z.object({
  filePath: z
    .string()
    .min(1, "File path cannot be empty")
    .describe("Path to the file being modified"),
  operation: z
    .enum(["new_file", "delete_file", "modify_file"])
    .describe("Type of change operation"),
  overview: z
    .string()
    .min(1, "Overview cannot be empty")
    .describe("Description of the changes that need to be applied to the file"),
});

export const ChangeOverviewsSchema = z.object({
  overviews: z
    .array(ChangeOverviewSchema)
    .describe(
      "List of change overviews for each file, ordered in terms of which file changes need to be done first."
    ),
});

export const RelevantFilePathsSchema = z.object({
  filePaths: z
    .array(z.string())
    .describe("List of file paths relevant to the user intent"),
});
