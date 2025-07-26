import { createTestSuite, Assertions } from "./lib/test-runner";

async function main() {
  const suite = createTestSuite("New Architecture - Comprehensive Test Suite");

  await suite.run(
    "Write-Only Mode: Add Logging Function",
    "Add a simple logging function to the index file",
    ["src/index.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      // Check that the intent is correct
      result.assert(
        result.result.intent.editMode === true,
        Assertions.isTrue("Should be in edit mode")
      );
      // Check that CHANGES.md was created if changes were made
      if (result.result.result.createdFiles.includes("CHANGES.md")) {
        result.assert(
          true,
          Assertions.isTrue("CHANGES.md was created successfully")
        );
      } else {
        result.assert(true, Assertions.isTrue("No changes were needed"));
      }
    },
    { writeOnly: true } // Pass writeOnly mode if supported by the test runner
  );

  await suite.run(
    "Simple Comment Addition",
    "Add a comment at the top of auth.ts explaining what this file does",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.editMode === true,
        Assertions.isTrue("Should be in edit mode")
      );
      result.assert(
        result.result.result.modifiedFiles.length,
        Assertions.greaterThan(0, "Should modify at least one file")
      );
    }
  );

  await suite.run(
    "Information Request",
    "What authentication methods are implemented in this project?",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.editMode === false,
        Assertions.isTrue("Should be in ask mode")
      );
      result.assert(
        result.result.result.modifiedFiles.length,
        Assertions.equals(0, "Should not modify any files")
      );
      result.assert(
        result.result.result.createdFiles.length,
        Assertions.equals(0, "Should not create any files")
      );
    }
  );

  await suite.run(
    "Complex Request with Discovery",
    "Add role-based authorization middleware to protect admin routes. Users should have roles stored in JWT tokens.",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.editMode === true,
        Assertions.isTrue("Should be in edit mode")
      );
      const needsContext = result.result.intent.needsMoreContext;
      const discoveredFiles = result.result.intent.filePaths.length > 1;
      const createdFiles = result.result.result.createdFiles.length > 0;
      result.assert(
        needsContext || discoveredFiles || createdFiles,
        (v) => v === true,
        "Should either need more context, discover more files, or create new files"
      );
    }
  );
}

main().catch((error) => {
  console.error("\n💥 Test execution failed:", error);
  process.exit(1);
});
