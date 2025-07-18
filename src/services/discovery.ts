import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { filterPathsWithinProject, resolveFilePath } from "../lib/utils";
import {
  MAX_FILES_PER_TERM,
  MAX_SEARCH_TIMEOUT,
  MAX_SEARCH_FILES,
} from "../lib/const";
import { Logger } from "./logger";

export namespace Discovery {
  const execAsync = promisify(exec);

  export async function discoverFromPaths(
    filePaths: string[],
    excludePaths: string[],
    projectRoot: string
  ): Promise<string[]> {
    if (filePaths.length === 0) return [];

    const resolvedPaths = filePaths.map((filePath) => {
      return resolveFilePath(filePath, projectRoot);
    });

    return filterPathsWithinProject(resolvedPaths, excludePaths, projectRoot);
  }

  export async function discoverFromSearchTerms(
    searchTerms: string[],
    excludePaths: string[],
    projectRoot: string
  ): Promise<string[]> {
    if (searchTerms.length === 0) return [];

    try {
      const candidateFiles = await searchFiles(searchTerms, projectRoot);
      const filteredFiles = filterPathsWithinProject(
        candidateFiles,
        excludePaths,
        projectRoot
      );
      return filteredFiles.slice(0, searchTerms.length * MAX_FILES_PER_TERM);
    } catch {
      return [];
    }
  }

  export async function searchFiles(
    symbols: string[],
    projectRoot: string,
    filePatterns: string[] = ["*.ts", "*.tsx", "*.js", "*.jsx"]
  ): Promise<string[]> {
    if (symbols.length === 0) return [];

    const escapedSymbols = symbols.map((symbol) =>
      symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const pattern = `\\b(${escapedSymbols.join("|")})\\b`;
    const typePatterns = filePatterns.map((p) => `-g "${p}"`).join(" ");

    // Add exclusions for common directories that should be ignored
    // Use ** to exclude node_modules at any depth
    const exclusions = [
      "--glob=!**/node_modules/**",
      "--glob=!**/dist/**",
      "--glob=!**/build/**",
      "--glob=!**/.git/**",
      "--glob=!**/coverage/**",
      "--glob=!**/.next/**",
      "--glob=!**/.nuxt/**",
    ].join(" ");

    // Limit results and add timeout to prevent hanging
    const rgCommand = `rg -l ${typePatterns} ${exclusions} --no-ignore-vcs --max-count ${50} "${pattern}" ${projectRoot}`;

    Logger.info(`Search: ${pattern}`);
    Logger.debug(`Search command: ${rgCommand}`);

    try {
      // Add 10 second timeout
      const result = await Promise.race([
        execAsync(rgCommand),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Search timeout")),
            MAX_SEARCH_TIMEOUT
          )
        ),
      ]);

      const files = result.stdout
        .trim()
        .split("\n")
        .filter((line: string) => line.length > 0)
        .map((file: string) => path.resolve(file))
        .filter((file: string) => {
          // Ensure the file is within the project root
          const relativePath = path.relative(projectRoot, file);
          return (
            !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
          );
        })
        .slice(0, MAX_SEARCH_FILES);

      return [...new Set(filterPathsWithinProject(files, [], projectRoot))];
    } catch (error: any) {
      Logger.warn(
        `Search failed for pattern: ${pattern}`,
        error?.message || "Unknown error"
      );
      return [];
    }
  }
}
