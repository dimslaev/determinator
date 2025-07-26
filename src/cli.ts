#!/usr/bin/env node

import { processRequest } from "./index";
import * as path from "path";
import { readFile } from "./lib/utils";

interface CLIOptions {
  prompt: string;
  files: string[];
  projectRoot: string;
  help: boolean;
  version: boolean;
  writeOnly: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    prompt: "",
    files: [],
    projectRoot: process.cwd(),
    help: false,
    version: false,
    writeOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      case "-p":
      case "--prompt":
        if (i + 1 < args.length) {
          options.prompt = args[++i];
        }
        break;
      case "-f":
      case "--files":
        // Collect all following arguments until next flag or end
        while (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          options.files.push(args[++i]);
        }
        break;
      case "-r":
      case "--root":
        if (i + 1 < args.length) {
          options.projectRoot = path.resolve(args[++i]);
        }
        break;
      case "-w":
      case "--write-only":
        options.writeOnly = true;
        break;
      default:
        // If no flags are provided, treat the first argument as prompt
        if (!options.prompt && !arg.startsWith("-")) {
          options.prompt = arg;
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Spaider - Deterministic-First AI Code Assistant

Usage:
  spaider [options] <prompt>
  spaider -p "your prompt" -f file1.ts file2.ts

Options:
  -p, --prompt <text>     The request/prompt for the AI assistant
  -f, --files <files...>  Initial files to include in the analysis
  -r, --root <path>       Project root directory (default: current directory)
  -w, --write-only        Write changes to a file instead of applying them directly
  -h, --help              Show this help message
  -v, --version           Show version information

Examples:
  spaider -p "Add a comment to explain this function" -f src/auth.ts
  spaider -p "Add role-based authorization" -f src/auth.ts src/middleware/
  spaider -p "Analyze error handling patterns" -r ./my-project
  spaider -w -p "Add error handling" -f src/auth.ts

Environment Variables:
  export OPENAI_API_KEY=...    Required. Your OpenAI API key
  export OPENAI_MODEL=...      Optional. Model to use (default: gpt-4.1)
  export OPENAI_BASE_URL=...   Optional. Custom OpenAI API base URL

Note:
  - If no files are specified, the assistant will discover relevant files automatically
  - The assistant works best with TypeScript/JavaScript projects
  - Make sure you have 'rg' (ripgrep) installed for file discovery
  - Use --write-only to generate a CHANGES.md file for manual review instead of applying changes directly
`);
}

async function showVersion() {
  try {
    const packageJsonPath = path.join(__dirname, "../package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath));
    console.log(`Spaider v${packageJson.version}`);
    console.log(`Description: ${packageJson.description}`);
  } catch (error) {
    console.log("Spaider v1.0.0");
  }
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    await showVersion();
    process.exit(0);
  }

  if (!options.prompt) {
    console.error("Error: Please provide a prompt.");
    console.error("Use 'spaider --help' for usage information.");
    process.exit(1);
  }

  try {
    const result = await processRequest(
      options.prompt,
      options.files,
      options.projectRoot,
      options.writeOnly
    );

    if (options.writeOnly) {
      if (result.result.createdFiles.includes("CHANGES.md")) {
        console.log(`\n✅ Changes written to CHANGES.md`);
        console.log(`📝 Review the file and apply changes manually`);
      } else {
        console.log(`\nℹ️  No changes to write (no modifications needed)`);
      }
    } else {
      if (result.result.modifiedFiles.length > 0) {
        console.log(`\nModified files:`);
        result.result.modifiedFiles.forEach((file) =>
          console.log(`  - ${file}`)
        );
      }

      if (result.result.createdFiles.length > 0) {
        console.log(`\nCreated files:`);
        result.result.createdFiles.forEach((file) =>
          console.log(`  - ${file}`)
        );
      }

      if (result.result.deletedFiles.length > 0) {
        console.log(`\nDeleted files:`);
        result.result.deletedFiles.forEach((file) =>
          console.log(`  - ${file}`)
        );
      }
    }
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}

export { main as cli };
