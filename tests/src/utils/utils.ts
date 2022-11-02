import type * as tsEslintParser from "@typescript-eslint/parser";
import path from "path";
import * as vueParser from "vue-eslint-parser";

const PROJECT_ROOT = path.join(__dirname, "../../..");

export function buildTypes(
  input: string,
  result: ReturnType<typeof tsEslintParser.parseForESLint>
): string {
  const tsNodeMap = result.services.esTreeNodeToTSNodeMap;
  const checker =
    result.services.program && result.services.program.getTypeChecker();

  const checked = new Set();

  const lines = input.split(/\r?\n/);
  const types: string[][] = [];

  function addType(node: any) {
    const tsNode = tsNodeMap.get(node);
    const type = checker.getTypeAtLocation(tsNode);
    const typeText = checker.typeToString(type);
    const lineTypes =
      types[node.loc.start.line - 1] || (types[node.loc.start.line - 1] = []);
    if (node.type === "Identifier") {
      lineTypes.push(`${node.name}: ${typeText}`);
    } else {
      lineTypes.push(`${input.slice(...node.range)}: ${typeText}`);
    }
  }

  vueParser.AST.traverseNodes(result.ast as any, {
    visitorKeys: result.visitorKeys as any,
    enterNode(node, parent) {
      if (checked.has(parent)) {
        checked.add(node);
        return;
      }

      if (
        node.type === "CallExpression" ||
        node.type === "Identifier" ||
        node.type === "MemberExpression"
      ) {
        addType(node);
        checked.add(node);
      }
    },
    leaveNode() {
      // noop
    },
  });
  return lines
    .map((l, i) => {
      if (!types[i]) {
        return l;
      }
      return `${l} // ${types[i].join(", ").replace(/\n\s*/g, " ")}`;
    })
    .join("\n")
    .replace(new RegExp(escapeRegExp(PROJECT_ROOT), "gu"), "");
}

function escapeRegExp(string: string) {
  return string.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&");
}
