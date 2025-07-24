# Spaider

AI code assistant that crawls your codebase to answer questions and implement changes.

Open source models often fail to use tools / function calling in a reliable manner.

Spaider uses structured outputs and deterministic workflows to ensure consistency and thorough implementation.

This is a working proof of concept.

For now it works with TS/JS projects only.

## Usage

```bash
# Make sure you have rg installed
brew install ripgrep

# Go to your project
cd project/

# Add env vars
export OPENAI_BASE_URL=https://api.infomaniak.com/1/ai
export OPENAI_MODEL=llama3
export OPENAI_API_KEY=your_api_key

# Install globally
npm i -g spaider@latest

# Ask question
spaider -p "What is this project about?"

# Ask for modification
spaider -p "Add a comment to explain this function" -f src/auth.ts
```

**CLI Options:**

- `-p, --prompt <text>`: The request/prompt for the AI assistant
- `-f, --files <files...>`: Initial files to include in the analysis
- `-r, --root <path>`: Project root directory (default: current directory)
- `-h, --help`: Show help message
- `-v, --version`: Show version information

## How It Works

Spaider has a pipeline architecture with conditional steps. It can be easily extended with more functionality and logic.

```ts
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
    when: isAskMode,
    steps: [generateAnswer],
  },
  {
    when: isEditMode,
    steps: [generateChanges, applyChanges],
  }
);
```
