import { processRequest } from "../../src";
import { Intent } from "../../src/lib/types";

export interface ProcessRequestResult {
  intent: Intent;
  result: {
    modifiedFiles: string[];
    deletedFiles: string[];
    createdFiles: string[];
  };
}

type AssertionFunction<T> = (value: T) => boolean;

interface Assertion<T> {
  message: string;
  check: AssertionFunction<T>;
}

export class TestResult {
  private assertions: Array<{
    message: string;
    passed: boolean;
  }> = [];

  constructor(
    public testName: string,
    public result: ProcessRequestResult | null,
    public error: any = null
  ) {}

  assert<T>(
    value: T,
    assertion: AssertionFunction<T> | Assertion<T>,
    message?: string
  ) {
    let passed: boolean;
    let assertionMessage: string;

    if (typeof assertion === "function") {
      passed = assertion(value);
      assertionMessage = message || "Assertion failed";
    } else {
      passed = assertion.check(value);
      assertionMessage = assertion.message;
    }

    this.assertions.push({ message: assertionMessage, passed });
    const status = passed ? "✅" : "❌";
    console.log(`    ${status} ${assertionMessage}`);
  }

  get success(): boolean {
    return !this.error && this.assertions.every((a) => a.passed);
  }
}

export async function runTest(
  testName: string,
  prompt: string,
  files: string[],
  projectRoot: string,
  assertions: (result: TestResult) => void
): Promise<TestResult> {
  console.log(`\n🧪 Running Test: ${testName}`);
  console.log("-----------------------------------------");
  let result: TestResult;
  try {
    const processResult = await processRequest(prompt, files, projectRoot);
    result = new TestResult(testName, processResult);
    if (result.result) {
      console.log(`  ✓ Intent: ${result.result.intent.description}`);
    }
    console.log("  🔎 Assertions:");
    assertions(result);
  } catch (error) {
    result = new TestResult(testName, null, error);
    console.error(`  💥 Test failed with error:`, error);
  }

  const status = result.success ? "PASS ✅" : "FAIL ❌";
  console.log(`  ---------------------------------------`);
  console.log(`  Test Status: ${status}`);

  return result;
}

export function createTestSuite(suiteName: string) {
  const testResults: TestResult[] = [];

  return {
    run: async (
      testName: string,
      prompt: string,
      files: string[],
      projectRoot: string,
      assertions: (result: TestResult) => void
    ) => {
      const result = await runTest(
        testName,
        prompt,
        files,
        projectRoot,
        assertions
      );
      testResults.push(result);
    },
    summarize: () => {
      console.log(`\n📊 Test Suite Summary: ${suiteName}`);
      console.log("===================================");

      const passedTests = testResults.filter((r) => r.success).length;
      const totalTests = testResults.length;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      testResults.forEach((result, index) => {
        const status = result.success ? "✅ PASS" : "❌ FAIL";
        console.log(`  ${index + 1}. ${result.testName}: ${status}`);
      });

      console.log(
        `\n🎯 Overall Success Rate: ${successRate.toFixed(
          1
        )}% (${passedTests}/${totalTests})`
      );

      return {
        success: successRate === 100,
        results: testResults,
        summary: {
          passed: passedTests,
          total: totalTests,
          rate: successRate,
        },
      };
    },
  };
}

// Assertion helpers
export const Assertions = {
  isTrue: (message: string): Assertion<boolean> => ({
    message,
    check: (value) => value === true,
  }),
  isFalse: (message: string): Assertion<boolean> => ({
    message,
    check: (value) => value === false,
  }),
  equals: <T>(expected: T, message?: string): Assertion<T> => ({
    message: message || `Should equal ${expected}`,
    check: (value) => value === expected,
  }),
  greaterThan: <T>(expected: T, message?: string): Assertion<T> => ({
    message: message || `Should be greater than ${expected}`,
    check: (value) => value > expected,
  }),
  hasFileChanges: (message: string = "Intent should have file changes") =>
    Assertions.isTrue(message),
  noFileChanges: (
    message: string = "Intent should not have file changes"
  ): Assertion<boolean> => Assertions.isFalse(message),
  scopeIs: (
    scope:
      | "project_wide"
      | "current_file"
      | "debugging"
      | "testing"
      | "general",
    message?: string
  ) => Assertions.equals(scope, message || `Intent scope should be "${scope}"`),
  modifiedFilesCount: (count: number, message?: string) =>
    Assertions.equals(count, message || `Should have modified ${count} files`),
  createdFilesCount: (count: number, message?: string) =>
    Assertions.equals(count, message || `Should have created ${count} files`),
};
