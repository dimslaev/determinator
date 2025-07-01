import { spawn } from "child_process";

export namespace Tree {
  export async function generateTree(
    projectRoot: string = process.cwd(),
    options: {
      types?: string[];
      exclude?: string[];
      maxFiles?: number;
    } = {}
  ): Promise<string> {
    const {
      types = ["ts", "tsx", "js", "jsx", "json", "md", "yaml", "yml"],
      exclude = ["node_modules", ".git", "dist", "build", ".next", "coverage"],
      maxFiles = 100,
    } = options;

    const files = await getRipgrepFiles(projectRoot, types, exclude, maxFiles);
    return buildTree(files);
  }

  async function getRipgrepFiles(
    projectRoot: string,
    types: string[],
    exclude: string[],
    maxFiles: number
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Use glob patterns for all file types to avoid ripgrep type issues
      const typeArgs = types.flatMap((type) => ["-g", `*.${type}`]);

      const args = [
        "--files",
        "--sort",
        "path",
        ...typeArgs,
        ...exclude.flatMap((path) => ["-g", `!${path}`]),
      ];

      const rg = spawn("rg", args, {
        cwd: projectRoot,
      });
      let output = "";

      rg.stdout.on("data", (data) => {
        output += data.toString();
      });

      rg.stderr.on("data", (data) => {
        console.error(`rg stderr: ${data}`);
      });

      rg.on("close", (code) => {
        if (code === 0 || code === 1) {
          // 1 is "no matches" which is ok
          const files = output.trim().split("\n").filter(Boolean);
          resolve(files.slice(0, maxFiles));
        } else {
          reject(new Error(`ripgrep exited with code ${code}`));
        }
      });
    });
  }

  function buildTree(files: string[]): string {
    const tree = new Map<string, { dirs: Set<string>; files: Set<string> }>();

    // Initialize root
    tree.set("", { dirs: new Set(), files: new Set() });

    // Build directory structure
    files.forEach((file) => {
      const parts = file.split("/");

      // Add all directory levels
      for (let i = 0; i < parts.length; i++) {
        const currentPath = parts.slice(0, i).join("/");
        const currentName = parts[i];

        if (!tree.has(currentPath)) {
          tree.set(currentPath, { dirs: new Set(), files: new Set() });
        }

        if (i === parts.length - 1) {
          // It's a file
          tree.get(currentPath)!.files.add(currentName);
        } else {
          // It's a directory
          tree.get(currentPath)!.dirs.add(currentName);
        }
      }
    });

    return formatTree(tree, "", "", new Set());
  }

  function formatTree(
    tree: Map<string, { dirs: Set<string>; files: Set<string> }>,
    currentPath: string,
    prefix: string,
    processedPaths: Set<string>
  ): string {
    if (processedPaths.has(currentPath)) return "";
    processedPaths.add(currentPath);

    const node = tree.get(currentPath);
    if (!node) return "";

    const lines: string[] = [];
    const dirs = Array.from(node.dirs).sort();
    const files = Array.from(node.files).sort();
    const totalItems = dirs.length + files.length;

    // Process directories first
    dirs.forEach((dir, index) => {
      const isLast = index === totalItems - 1 && files.length === 0;
      const connector = isLast ? "└── " : "├── ";
      const nextPrefix = prefix + (isLast ? "    " : "│   ");

      lines.push(`${prefix}${connector}${dir}/`);

      const childPath = currentPath ? `${currentPath}/${dir}` : dir;
      const childTree = formatTree(tree, childPath, nextPrefix, processedPaths);
      if (childTree) {
        lines.push(childTree);
      }
    });

    // Process files
    files.forEach((file, index) => {
      const isLast = index === files.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${file}`);
    });

    return lines.join("\n");
  }
}
