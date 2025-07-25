import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Intent, FileContext, Change, Changes } from "../lib/types";
import { IntentSchema, ChangesSchema } from "../lib/schemas";
import {
  system,
  user,
  formatFilePreviews,
  formatFileSemantics,
  formatChanges,
} from "../lib/utils";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { RequestOptions } from "openai/core";
import { Logger } from "./logger";

const DEFAULT_SYSTEM_ROLE =
  "You are an AI assistant specialized in software development and code generation.";

export namespace AI {
  const openai = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "",
    apiKey: process.env.OPENAI_API_KEY || "no-key",
  });

  export async function complete(
    body: Partial<ChatCompletionCreateParamsNonStreaming>,
    options?: RequestOptions
  ) {
    if (!body.messages) {
      throw new Error("No messages for complete request");
    }

    const {
      model = process.env.OPENAI_MODEL || "gpt-4.1",
      temperature = 0,
      max_completion_tokens = 8000,
      messages,
      ...rest
    } = body;

    const response = await openai.chat.completions.create(
      {
        model,
        temperature,
        max_completion_tokens,
        messages,
        ...rest,
      },
      {
        maxRetries: 2,
        timeout: 30_000,
        ...options,
      }
    );

    return response;
  }

  export async function completeStructured<T>(params: {
    role?: string;
    user: string;
    schema: z.Schema;
    name: string;
  }): Promise<T> {
    const messages = [
      system(
        `${params.role || DEFAULT_SYSTEM_ROLE}
You must respond with valid JSON that matches the provided schema. 
Do not include any text outside the JSON response. 
Do not wrap the JSON in markdown code blocks or use \`\`\` formatting.`
      ),
      user(params.user),
    ];

    const response = await complete({
      messages,
      response_format: zodResponseFormat(params.schema, params.name),
    });

    const content = response.choices[0].message.content!;

    // Remove any potential markdown code block markers that might have been added
    const cleanContent = content
      .replace(/^```[\w]*\n?/, "")
      .replace(/\n?```$/, "");

    try {
      const parsed = JSON.parse(cleanContent);
      return params.schema.parse(parsed);
    } catch (error) {
      Logger.error("=== JSON PARSING ERROR ===");
      Logger.error("Full response content:");
      Logger.error(cleanContent);
      Logger.error("========================");
      Logger.error("Error:", error);

      // If JSON parse fails, try to identify common issues
      if (error instanceof SyntaxError) {
        Logger.error("JSON Syntax Error detected. Common issues:");
        if (cleanContent.includes("`")) {
          Logger.error("- Contains backticks (`) which are not valid in JSON");
        }
        if (cleanContent.includes("\n") && !cleanContent.includes("\\n")) {
          Logger.error("- Contains unescaped newlines");
        }
        if (cleanContent.match(/[^\\]"/)) {
          Logger.error("- Contains unescaped quotes");
        }
      }

      throw error;
    }
  }

  export async function analyzeIntent(
    userPrompt: string,
    files: FileContext[],
    _projectTree: string
  ): Promise<Intent> {
    const filePreview = formatFilePreviews(files);
    const semanticSummary = formatFileSemantics(files);

    const prompt = `
Analyze this code related request to understand the user intent.

User Request: ${userPrompt}

Files provided:
${filePreview}

Code Symbols:
${semanticSummary}

Based on this information, determine:
1. Should files be changed to fulfill the user's request? Set editMode to true if the user is asking for any code be created or modified. Set editMode to false if the user is only asking for information, explanation, or code review. If the request is ambiguous, prefer false unless there is a clear instruction to change files.
2. A clear description of what needs to be done (be specific about the scope and impact)
3. Whether additional context is needed to proceed - set needsMoreContext to true if additional files or information are needed
4. List of file paths relevant to this intent (filePaths)
5. List of relevant identifiers (searchTerms) EXCLUSIVELY from the "Code Symbols" above.
    `;

    return await completeStructured<Intent>({
      user: prompt,
      schema: IntentSchema,
      name: "intent",
    });
  }

  export async function generateChanges(
    _userPrompt: string,
    intent: Intent,
    files: FileContext[],
    _projectTree: string
  ): Promise<Change[]> {
    const filePreview = formatFilePreviews(files);

    const prompt = `
      ${intent.description}

      Files provided:
      ${filePreview}
      
      Based on this information, generate a JSON response with a "changes" array containing change objects. Each change object should have:
      1. operation: [new_file, delete_file, modify_file]
      2. filePath: The path to the file being created, deleted or modified
      3. modificationType: [replace_block, add_block, remove_block, none]. For deleted files, use type none.
      4. modificationDescription: The description of the modification relative to the code blocks. Leave empty if not applicable.
      5. oldCodeBlock: Applicable when modifying existing files. Leave empty if not applicable.
      6. newCodeBlock: Applicable when modifying existing files or creating new ones. Leave empty if not applicable.
      
      Focus on generating precise changes aligned with existing code structure while maintaining high code quality. 
      For modifications, generate multiple changes per file if necessary.
      
      CRITICAL: Return ONLY valid JSON. Do not use backticks, template literals, or multi-line strings. 
      Escape all quotes and newlines properly in JSON strings.
      
      Use \\n for newlines within strings, not actual line breaks.
      Use \" for quotes within strings.
      
      Return the response in this exact format:
      {
        "changes": [
          {
            "operation": "modify_file",
            "filePath": "path/to/file.ts",
            "modificationType": "add_block",
            "modificationDescription": "Description of change",
            "oldCodeBlock": "",
            "newCodeBlock": "// New code here\\nfunction example() {\\n  return true;\\n}"
          }
        ]
      }
    `;

    const result = await completeStructured<Changes>({
      role: "You are a senior software engineer generating precise code changes. Generate high-quality, production-ready code changes to implement the following request",
      user: prompt,
      schema: ChangesSchema,
      name: "changes",
    });

    return result.changes;
  }

  export async function applyFileChanges(
    changes: Change[],
    currentFileContent: string
  ): Promise<string> {
    const formattedChanges = formatChanges(changes);

    if (changes[0].operation === "delete_file") {
      throw new Error("AI should not handle delete operations");
    }

    const header =
      changes[0].operation === "new_file"
        ? "Create a new file with the requested code blocks."
        : "Apply ONLY the specified modifications to this existing file.";

    const prompt = `
      ${header}

      Current File Content:
      \`\`\`
      ${currentFileContent}
      \`\`\`

      Modifications to Apply:
      ${formattedChanges}

      Instructions:
      1. Start with the exact current file content shown above
      2. Apply ONLY the specified modifications - do not change anything else
      3. For replace_block: find the exact old code block and replace it with the new code block
      4. For add_block: insert the new code block at the appropriate location
      5. For remove_block: remove only the specified code block
      6. Maintain ALL existing formatting, imports, exports, and other code exactly as they are
      7. Return the complete modified file content
      8. Do not add explanations, comments, or markdown formatting

      Apply the modifications precisely and return the complete file.
    `;

    const response = await complete({
      messages: [
        system(
          `${DEFAULT_SYSTEM_ROLE}
Return only the complete rewritten file content without any additional formatting or explanation.`
        ),
        user(prompt),
      ],
    });

    const rewrittenContent = response.choices[0].message.content!.trim();

    // Remove any potential markdown code block markers that might have been added
    return rewrittenContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
  }

  export async function generateAnswer(
    _userPrompt: string,
    intent: Intent,
    files: FileContext[],
    _projectTree?: string
  ): Promise<string> {
    const filePreview = formatFilePreviews(files);

    const prompt = `
${intent.description}

Files analyzed:
${filePreview}
    `;

    const response = await complete({
      messages: [
        system(`${DEFAULT_SYSTEM_ROLE}
For code-related prompts, prioritize code output with minimal explanation.
For refactoring requests, provide the refactored code and a very short summary of changes.
Always deliver clear, concise and efficient answers.`),
        user(prompt),
      ],
    });

    return response.choices[0].message.content!.trim();
  }
}
