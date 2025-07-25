import { createTestSuite, Assertions } from "./lib/test-runner";

async function main() {
  const suite = createTestSuite(
    "Scenario B: Medium Complex - Add Role-Based Authorization"
  );

  await suite.run(
    "Add role-based authorization middleware",
    "Add role-based authorization middleware that checks if user is admin before allowing access to certain routes. Create a middleware function that extracts the user role from the JWT token and only allows admin users to proceed.",
    ["src/auth.ts"],
    "test-repo",
    (result) => {
      if (!result.result) return;
      result.assert(
        result.result.intent.editMode === true,
        Assertions.isTrue("Should be in edit mode")
      );
      result.assert(
        result.result.result.createdFiles.length,
        Assertions.greaterThan(
          0,
          "Should create at least one new file for the middleware"
        )
      );
      result.assert(
        result.result.result.modifiedFiles.length,
        Assertions.greaterThan(0, "Should modify existing files")
      );
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
