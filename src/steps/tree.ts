import { Tree } from "../services/tree";
import { PipelineStep, PipelineContext } from "../lib/types";

export const generateProjectTree: PipelineStep<PipelineContext> = async (
  ctx
) => {
  console.log(`Generating project tree for: ${ctx.projectRoot}`);

  try {
    const treeOptions = {
      types: ["ts", "tsx", "js", "jsx", "json", "md", "yaml", "yml"],
      exclude: ["node_modules", ".git", "dist", "build", ".next", "coverage"],
      maxFiles: 100,
    };

    const tree = await Tree.generateTree(ctx.projectRoot, treeOptions);

    console.log(`Generated tree with ${tree.split("\n").length} lines`);

    return {
      ...ctx,
      projectTree: tree,
    };
  } catch (error) {
    console.error("Error generating project tree:", error);
    // Continue without tree if generation fails
    return {
      ...ctx,
      projectTree: undefined,
    };
  }
};
