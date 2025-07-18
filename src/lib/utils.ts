import * as path from "path";
import { promises as fs } from "fs";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import dedent from "dedent";
import { Change, FileContext } from "./types";
import { MAX_FILE_PREVIEW_LINES } from "./const";
import { Logger } from "../services/logger";

export function message(
  role: "system" | "user",
  content: string
): ChatCompletionMessageParam {
  return { role, content: dedent(content) };
}

export function system(content: string) {
  return message("system", content);
}

export function user(content: string) {
  return message("user", content);
}

export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

export function detectLanguage(filePath: string): FileContext["language"] {
  const ext = path.extname(filePath);
  switch (ext) {
    case ".ts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".jsx":
      return "jsx";
    case ".js":
      return "javascript";
    default:
      return "javascript";
  }
}

export function getRelativePath(from: string, to: string): string {
  return path.normalize(path.relative(from, to)).replace(/\\/g, "/");
}

export function filterPathsWithinProject(
  filePaths: string[],
  excludePaths: string[],
  projectRoot: string
): string[] {
  return filePaths
    .filter((file) => !excludePaths.includes(file))
    .filter((filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
    });
}

export function sanitizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, "/");
}

export function getDisplayPath(filePath: string, projectRoot?: string): string {
  if (projectRoot && filePath.startsWith(projectRoot)) {
    return filePath.substring(projectRoot.length).replace(/^\/+/, "");
  }
  return sanitizePath(filePath);
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

export async function loadFileContexts(
  filePaths: string[]
): Promise<FileContext[]> {
  const contexts = await Promise.all(
    filePaths.map(async (path) => {
      try {
        return {
          path,
          content: await readFile(path),
          language: detectLanguage(path) as FileContext["language"],
        };
      } catch (error) {
        Logger.warn(`Failed to read discovered file ${path}`);
        return null;
      }
    })
  );

  return contexts.filter((c) => c !== null) as FileContext[];
}

export function formatFilePreview(file: FileContext): string {
  if (!file.content) {
    throw new Error("Missing file content");
  }

  const lines = file.content.split("\n");
  const fileContent =
    lines.length > MAX_FILE_PREVIEW_LINES
      ? lines.slice(0, MAX_FILE_PREVIEW_LINES).join("\n") + "\n...[truncated]"
      : file.content;

  return `${file.path}:\n${fileContent}`;
}

export function formatFileSemantic(file: FileContext): string {
  if (!file.ast) {
    throw new Error("Missing file ast");
  }
  return dedent`${file.path}:
    - Imports: ${file.ast.imports.map((i) => i.source).join(", ")}
    - Exports: ${file.ast.exports.map((e) => e.name).join(", ")}
    - Functions: ${file.ast.functions.map((f) => f.name).join(", ")}
    - Classes: ${file.ast.classes.map((c) => c.name).join(", ")}`;
}

export function formatFilePreviews(files: FileContext[]) {
  return files.map(formatFilePreview).join("\n\n");
}

export function formatFileSemantics(files: FileContext[]) {
  return files.map(formatFileSemantic).join("\n");
}

export function formatChanges(changes: Change[]): string {
  return changes
    .map((change) => {
      let changeDescription = `${change.filePath}: ${change.operation}`;

      if (change.operation !== "delete_file") {
        changeDescription += ` (${change.modificationType})`;
      }

      if (change.modificationDescription) {
        changeDescription += `\n${change.modificationDescription}`;
      }

      if (change.oldCodeBlock) {
        changeDescription += `\nOld Code Block:\n${change.oldCodeBlock}`;
      }

      if (change.newCodeBlock) {
        changeDescription += `\nNew Code Block:\n${change.newCodeBlock}`;
      }

      return changeDescription;
    })
    .join("\n\n");
}

// File Path Utilities
export function resolveFilePath(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(projectRoot, filePath);
}

export async function ensureDirectoryForFile(filePath: string): Promise<void> {
  const dirPath = path.dirname(filePath);
  await ensureDirectoryExists(dirPath);
}

export function normalizeFilePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, "/");
}

export function isWithinProjectRoot(
  filePath: string,
  projectRoot: string
): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(projectRoot);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

export function getFileNameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function joinPaths(...paths: string[]): string {
  return normalizeFilePath(path.join(...paths));
}

export function makeRelativeToProject(
  filePath: string,
  projectRoot: string
): string {
  const resolved = resolveFilePath(filePath, projectRoot);
  return getRelativePath(projectRoot, resolved);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function safeWriteFile(
  filePath: string,
  content: string,
  projectRoot?: string
): Promise<void> {
  const resolvedPath = projectRoot
    ? resolveFilePath(filePath, projectRoot)
    : filePath;

  // Ensure the file path is within project bounds if projectRoot is provided
  if (projectRoot && !isWithinProjectRoot(resolvedPath, projectRoot)) {
    throw new Error(
      `File path ${filePath} is outside project root ${projectRoot}`
    );
  }

  await ensureDirectoryForFile(resolvedPath);
  await fs.writeFile(resolvedPath, content, "utf-8");
}

export async function safeDeleteFile(
  filePath: string,
  projectRoot?: string
): Promise<void> {
  const resolvedPath = projectRoot
    ? resolveFilePath(filePath, projectRoot)
    : filePath;

  // Ensure the file path is within project bounds if projectRoot is provided
  if (projectRoot && !isWithinProjectRoot(resolvedPath, projectRoot)) {
    throw new Error(
      `File path ${filePath} is outside project root ${projectRoot}`
    );
  }

  if (await fileExists(resolvedPath)) {
    await fs.unlink(resolvedPath);
  }
}
