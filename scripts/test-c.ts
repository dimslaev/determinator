import { createTestSuite, Assertions } from "./lib/test-runner";

async function main() {
  const suite = createTestSuite("New Architecture - Comprehensive Test Suite");

  await suite.run(
    "Simple Comment Addition",
    "Add a comment at the top of auth.ts explaining what this file does",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.hasFileChanges,
        Assertions.isTrue("Intent should indicate file changes")
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
        result.result.intent.hasFileChanges,
        Assertions.isFalse("Intent should not indicate file changes")
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
        result.result.intent.hasFileChanges,
        Assertions.isTrue("Intent should indicate file changes")
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

  await suite.run(
    "Project-wide Analysis",
    "Analyze the current error handling patterns across the codebase",
    ["src/auth.ts", "src/models/user.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      const scope = result.result.intent.scope;
      result.assert(
        scope === "project_wide" || scope === "debugging",
        (v) => v === true,
        'Scope should be "project_wide" or "debugging"'
      );
      result.assert(
        result.result.intent.hasFileChanges,
        Assertions.isFalse("Intent should not have file changes")
      );
    }
  );

  const summary = suite.summarize();

  if (!summary.success) {
    console.error(
      `\n❌ Test suite failed with ${summary.summary.rate.toFixed(
        1
      )}% success rate`
    );
    process.exit(1);
  } else {
    console.log(
      `\n🎉 Test suite passed with ${summary.summary.rate.toFixed(
        1
      )}% success rate!`
    );
    console.log("🚀 New architecture is working correctly");
  }
}

main().catch((error) => {
  console.error("\n💥 Test execution failed:", error);
  process.exit(1);
});
