import { PipelineStepDefinition } from "./types";

export const pipeline =
  <T>(...steps: PipelineStepDefinition<T>[]) =>
  async (context: T): Promise<T> => {
    let result = context;

    for (const step of steps) {
      if (typeof step === "function") {
        // Simple step function
        console.log(`Executing step: ${step.name}`);
        result = await step(result);
      } else if (Array.isArray(step)) {
        // Conditional step: [condition, function]
        const [condition, fn] = step;
        if (condition(result)) {
          console.log(`Executing conditional step: ${fn.name}`);
          result = await fn(result);
        } else {
          console.log(`Skipping conditional step: ${fn.name}`);
        }
      } else {
        // Object syntax: { when: condition, steps: [...] }
        if (step.when(result)) {
          console.log(`Executing step group (${step.steps.length} steps)`);
          for (const fn of step.steps) {
            console.log(`  - ${fn.name}`);
            result = await fn(result);
          }
        } else {
          console.log(`Skipping step group (${step.steps.length} steps)`);
        }
      }
    }

    return result;
  };
