import { PipelineStepDefinition } from "./types";
import { Logger } from "../services/logger";

export const pipeline =
  <T>(...steps: PipelineStepDefinition<T>[]) =>
  async (context: T): Promise<T> => {
    let result = context;

    for (const step of steps) {
      if (typeof step === "function") {
        // Simple step function
        Logger.debug(`Executing step: ${step.name}`);
        result = await step(result);
      } else if (Array.isArray(step)) {
        // Conditional step: [condition, function]
        const [condition, fn] = step;
        if (condition(result)) {
          Logger.debug(`Executing conditional step: ${fn.name}`);
          result = await fn(result);
        } else {
          Logger.debug(`Skipping conditional step: ${fn.name}`);
        }
      } else {
        // Object syntax: { when: condition, steps: [...] }
        if (step.when(result)) {
          Logger.debug(`Executing step group (${step.steps.length} steps)`);
          for (const fn of step.steps) {
            Logger.debug(`  - ${fn.name}`);
            result = await fn(result);
          }
        } else {
          Logger.debug(`Skipping step group (${step.steps.length} steps)`);
        }
      }
    }

    return result;
  };
