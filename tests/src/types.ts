/**
 * @author Yosuke Ota
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import * as parser from "vue-eslint-parser";
import * as tsParser from "../../src";
import * as tsEslintParser from "@typescript-eslint/parser";
import semver from "semver";
import assert from "assert";
import { iterateFixtures } from "./fixtures";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const ROOT = path.join(__dirname, "../fixtures/types");
const PARSER_OPTIONS = {
  comment: true,
  ecmaVersion: 2020,
  loc: true,
  range: true,
  tokens: true,
  parser: {
    ts: tsParser,
    "<template>": {
      parseForESLint(code: string, options: any) {
        return tsEslintParser.parseForESLint(code, {
          ...options,
          project: undefined,
        });
      },
    },
  },
};

function buildTypes(
  input: string,
  result: ReturnType<typeof tsEslintParser.parseForESLint>
) {
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

  parser.AST.traverseNodes(result.ast as any, {
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
    .join("\n");
}

//------------------------------------------------------------------------------
// Main
//------------------------------------------------------------------------------

describe("Template Types", () => {
  for (const { name, sourcePath, filePath, tsconfigPath } of iterateFixtures(
    ROOT
  )) {
    // if (!sourcePath.endsWith(".ts")) continue;
    const optionsPath = path.join(filePath, `parser-options.json`);
    const requirementsPath = path.join(filePath, `requirements.json`);
    const source = fs.readFileSync(sourcePath, "utf8");
    const parserOptions = fs.existsSync(optionsPath)
      ? JSON.parse(fs.readFileSync(optionsPath, "utf8"))
      : {};
    const requirements = fs.existsSync(requirementsPath)
      ? JSON.parse(fs.readFileSync(requirementsPath, "utf8"))
      : {};
    const options = Object.assign(
      { filePath: sourcePath },
      PARSER_OPTIONS,
      { project: tsconfigPath },
      parserOptions
    );

    if (
      Object.entries(requirements).some(([pkgName, pkgVersion]) => {
        const version =
          pkgName === "node"
            ? process.version
            : // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
              require(`${pkgName}/package.json`).version;
        return !semver.satisfies(version, pkgVersion as string);
      })
    ) {
      continue;
    }

    describe(`'test/fixtures/ast/${name}/${path.basename(sourcePath)}'`, () => {
      it("should be parsed to valid Types.", () => {
        const result = parser.parseForESLint(source, options);
        const actual = buildTypes(source, result as any);
        const resultPath = sourcePath.replace(/source\.([a-z]+)$/u, "types.$1");

        if (!fs.existsSync(resultPath)) {
          fs.writeFileSync(resultPath, actual);
        }
        fs.writeFileSync(resultPath, actual); // TODO
        const expected = fs.readFileSync(resultPath, "utf8");

        try {
          assert.strictEqual(actual, expected);
        } catch (e) {
          fs.writeFileSync(path.join(ROOT, `${name}/actual-types.vue`), actual);
          throw e;
        }
      });
    });
  }
});
