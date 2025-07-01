import { Project } from "ts-morph";
import * as path from "path";
import { FileContext, SemanticInfo } from "../lib/types";

export namespace AST {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      jsx: 1, // React JSX
      target: 99, // ESNext
    },
  });

  export async function parseFile(file: FileContext): Promise<SemanticInfo> {
    try {
      // Create source file in ts-morph
      const sourceFile = project.createSourceFile(
        `temp_${Date.now()}_${path.basename(file.path)}`,
        file.content,
        { overwrite: true }
      );

      const semanticInfo: SemanticInfo = {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        dependencies: new Set(),
      };

      // Extract imports
      sourceFile.getImportDeclarations().forEach((importDecl) => {
        const source = importDecl.getModuleSpecifierValue();
        const specifiers: string[] = [];

        // Default import
        const defaultImport = importDecl.getDefaultImport();
        if (defaultImport) {
          specifiers.push(`default as ${defaultImport.getText()}`);
        }

        // Namespace import
        const namespaceImport = importDecl.getNamespaceImport();
        if (namespaceImport) {
          specifiers.push(`* as ${namespaceImport.getText()}`);
        }

        // Named imports
        importDecl.getNamedImports().forEach((namedImport) => {
          const name = namedImport.getName();
          const alias = namedImport.getAliasNode();
          specifiers.push(alias ? `${name} as ${alias.getText()}` : name);
        });

        semanticInfo.imports.push({ source, specifiers });

        if (source.startsWith("./") || source.startsWith("../")) {
          semanticInfo.dependencies.add(source);
        }
      });

      // Extract exports
      sourceFile.getExportDeclarations().forEach((exportDecl) => {
        exportDecl.getNamedExports().forEach((namedExport) => {
          const name = namedExport.getName();
          semanticInfo.exports.push({ name, type: "export" });
        });
      });

      // Export assignments and default exports
      sourceFile.getExportAssignments().forEach((exportAssign) => {
        semanticInfo.exports.push({
          name: exportAssign.isExportEquals() ? "export=" : "default",
          type: "default",
        });
      });

      // Functions (both declarations and exports)
      sourceFile.getFunctions().forEach((func) => {
        const name = func.getName() || "anonymous";
        const params = func.getParameters().map((param) => {
          const paramName = param.getName();
          if (param.hasQuestionToken()) return `${paramName}?`;
          if (param.isRestParameter()) return `...${paramName}`;
          return paramName;
        });

        semanticInfo.functions.push({
          name,
          params,
          line: func.getStartLineNumber(),
        });

        // If it's exported, add to exports
        if (func.isExported()) {
          semanticInfo.exports.push({ name, type: "function" });
        }
      });

      // Classes
      sourceFile.getClasses().forEach((cls) => {
        const name = cls.getName() || "anonymous";
        const methods = cls.getMethods().map((method) => method.getName());

        semanticInfo.classes.push({
          name,
          methods,
          line: cls.getStartLineNumber(),
        });

        // If it's exported, add to exports
        if (cls.isExported()) {
          semanticInfo.exports.push({ name, type: "class" });
        }
      });

      // Variable exports
      sourceFile.getVariableStatements().forEach((varStatement) => {
        if (varStatement.isExported()) {
          varStatement.getDeclarations().forEach((decl) => {
            const name = decl.getName();
            semanticInfo.exports.push({ name, type: "variable" });
          });
        }
      });

      // Clean up the temporary file
      sourceFile.delete();

      return semanticInfo;
    } catch (error) {
      console.warn(`Failed to parse file ${file.path}:`, error);
      return {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        dependencies: new Set(),
      };
    }
  }
}
