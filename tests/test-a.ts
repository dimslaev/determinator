import { createTestSuite, Assertions } from "./lib/test-runner";

async function main() {
  const suite = createTestSuite("Scenario A: Simple Comment Addition");

  await suite.run(
    "Add a simple comment to auth.ts",
    "Add a simple comment to the top of the auth.ts file",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.editMode === true,
        Assertions.isTrue("Should be in edit mode")
      );
      result.assert(result.result.result.modifiedFiles.length, (v) => v > 0);
    }
  );

  const summary = suite.summarize();

  if (!summary.success) {
    console.error("\n❌ Test suite failed, exiting with error code 1");
    process.exit(1);
  } else {
    console.log("\n🎉 Test suite completed successfully!");
  }
}

main().catch((error) => {
  console.error("\n💥 Test execution failed:", error);
  process.exit(1);
});
