import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as dotenv from "dotenv";
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

dotenv.config();

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
      options
    );

    return response;
  }

  export async function completeStructured<T>(
    prompt: string,
    schema: z.Schema,
    name: string
  ): Promise<T> {
    const messages = [
      system(
        "You must respond with valid JSON that matches the provided schema. Do not include any text outside the JSON response."
      ),
      user(prompt),
    ];

    const response = await complete({
      messages,
      response_format: zodResponseFormat(schema, name),
    });

    const content = response.choices[0].message.content!;

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      console.error(
        "Failed to parse AI response as JSON:\n",
        content.slice(0, 500),
        "\n",
        error
      );

      throw error;
    }
  }

  export async function analyzeIntent(
    userPrompt: string,
    files: FileContext[],
    projectTree: string
  ): Promise<Intent> {
    const filePreview = formatFilePreviews(files);
    const semanticSummary = formatFileSemantics(files);

    const prompt = `
      Analyze this code modification request to understand the intent and scope.

      User Request: ${userPrompt}

      Files provided:
      ${filePreview}

      Semantic Analysis:
      ${semanticSummary}

      Project tree: 
      ${projectTree}

      Based on this information, determine:
      1. What is the scope of the request [current_file, project_wide, debugging, testing, general, unknown]
      2. What mode - whether the user is requesting information (ask) or wants to make code changes (edit)
      3. A clear description of what needs to be done (be specific about the scope and impact)
      4. Whether the user intends to perform any file operations (create, modify, or delete files) - set hasFileChanges to true for requests that involve writing code, adding comments, creating files, or making any modifications to the codebase
      5. Whether you need additional files to understand the context fully, and if so, which ones
      6. Any semantic hints or clues that could assist in discovering relevant code or files.
      
      Focus on understanding the core intent rather than implementation details.
      If the request is ambiguous, ask the user for more information.
      Generate only precise, existing terms that would actually appear in the source code.
    `;

    return await completeStructured<Intent>(prompt, IntentSchema, "intent");
  }

  export async function generateChanges(
    userPrompt: string,
    intent: Intent,
    files: FileContext[],
    projectTree: string
  ): Promise<Change[]> {
    console.log(`Generating changes for intent: ${intent.description}`);

    const filePreview = formatFilePreviews(files);

    const prompt = `
      You are a senior software engineer generating precise code changes. Generate high-quality, production-ready code changes to implement the following request:

      User Request: ${userPrompt}
      
      Intent Analysis:
      - Scope: ${intent.scope}
      - Description: ${intent.description}

      Project Tree: 
      ${projectTree}

      Code Quality Requirements:
      - Follow the existing file patterns and conventions
      - Maintain consistent indentation and formatting
      - Place utility functions and constants at appropriate scope levels
      - Ensure all variables are properly scoped

      Files provided:
      ${filePreview}
      
      Based on this information, determine:
      1. The operation type: [new_file, delete_file, modify_file]
      2. The path to the file being created, deleted or modified
      3. The modification type: [replace_block, add_block, remove_block, none]. For deleted files, use type none.
      4. The description of the modification relative to the code blocks. Leave empty if not applicable.
      5. The old code block, applicable when modifying existing files. Leave empty if not applicable.
      6. The new code block, applicable when modifying existing files or creating new ones. Leave empty if not applicable.
      
      Focus on generating precise changes aligned with existing code structure while maintaining high code quality. 
      For modifications, generate multiple changes per file if necessary.
    `;

    const result = await completeStructured<Changes>(
      prompt,
      ChangesSchema,
      "changes"
    );

    console.log(result.changes);

    console.log(`✓ Generated ${result.changes.length} changes`);
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
          "You are a code rewriting assistant. Return only the complete rewritten file content without any additional formatting or explanation."
        ),
        user(prompt),
      ],
    });

    const rewrittenContent = response.choices[0].message.content!.trim();

    // Remove any potential markdown code block markers that might have been added
    return rewrittenContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
  }

  export async function generateAnswer(
    userPrompt: string,
    intent: Intent,
    files: FileContext[],
    projectTree?: string
  ): Promise<string> {
    console.log(`Generating answer for intent: ${intent.description}`);

    const filePreview = formatFilePreviews(files);
    const semanticSummary = formatFileSemantics(files);

    const prompt = `
      User Question: ${userPrompt}
      
      Intent Analysis:
      - Scope: ${intent.scope}
      - Description: ${intent.description}

      ${projectTree ? `Project Structure:\n${projectTree}` : ""}

      Files analyzed:
      ${filePreview}

      Semantic Analysis:
      ${semanticSummary}
      
      Based on this codebase analysis, provide a comprehensive, accurate answer to the user's question. 
      Include specific code examples, file references, and explanations where relevant.
      If you cannot find the requested information in the provided files, clearly state what's missing.
      Focus on being helpful and precise while avoiding speculation about code not shown.
    `;

    const response = await complete({
      messages: [
        system(
          "You are a helpful software engineering assistant. Provide clear, accurate, and detailed answers based on the code analysis provided."
        ),
        user(prompt),
      ],
    });

    return response.choices[0].message.content!.trim();
  }
}
