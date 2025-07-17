# Spaider

AI code assistant that crawls your codebase to implement changes using open source LLMs.

This is a working proof of concept.

## Motivation

Modern AI code assistants rely on major LLMs that are heavily optimized for tool calling.
Open source models struggle with this approach, often failing to call the right tools with the right arguments at the right time.

Spaider uses structured outputs and deterministic workflows to ensure consistency and thorough implementation.

## Prerequisites

Before trying spaider, you need to install `rg` (ripgrep) which is used for fast code searching:

```bash
# macOS (using Homebrew)
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Windows (using Chocolatey)
choco install ripgrep

# Or download from: https://github.com/BurntSushi/ripgrep/releases
```

## How It Works

A pipeline architecture using specialized services and conditional steps:

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

## Testing

The `test-repo` directory contains a sample project that allows to easily test real-world scenarios with actual LLM calls and responses. You can run different scenarios:

```bash
npm run test-a  # Simple comment addition
npm run test-b  # Medium complexity - role-based authorization
npm run test-c  # Comprehensive test suite
```

## Next Steps

The pipeline design makes the solution easily extensible. Some critical next steps would include:

- Adding a secondary (weaker) model for change applications
- Adding a project analysis step
- Code validation and linting
- Formatting passes
- Additional rounds of file discovery
- User feedback and progress updates
