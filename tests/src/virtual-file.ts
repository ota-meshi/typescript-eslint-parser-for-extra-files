/**
 * @author Yosuke Ota
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import * as vueParser from "vue-eslint-parser";
import * as tsParser from "../../src";
import semver from "semver";
import assert from "assert";
import { buildTypes } from "./utils/utils";
import { iterateFixtures } from "./utils/fixtures";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const ROOT = path.join(__dirname, "../fixtures/types/vue");
const PARSER_OPTIONS = {
  comment: true,
  ecmaVersion: 2020,
  loc: true,
  range: true,
  tokens: true,
  parser: tsParser,
};

//------------------------------------------------------------------------------
// Main
//------------------------------------------------------------------------------

describe("Virtual Files", () => {
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

    describe(`'test/fixtures/vue/${name}/${path.basename(
      options.filePath
    )}/v.ts'`, () => {
      it("should be parsed to valid Types.", () => {
        const virtualSource = source.replace(/from "\./gu, 'from "../.');
        const virtualOptions = {
          ...options,
          filePath: `${options.filePath}/v.ts`,
        };
        const result =
          path.extname(sourcePath) === ".ts"
            ? tsParser.parseForESLint(virtualSource, virtualOptions)
            : vueParser.parseForESLint(virtualSource, virtualOptions);

        const actual = buildTypes(virtualSource, result as any).replace(
          /from "\.\.\/\./gu,
          'from ".'
        );
        const resultPath = sourcePath.replace(/source\.([a-z]+)$/u, "types.$1");
        const expected = fs.readFileSync(resultPath, "utf8");
        assert.strictEqual(actual, expected);
      });
    });
    describe(`'test/fixtures/vue/${name}/${path.basename(
      options.filePath
    )}/v/v.ts'`, () => {
      it("should be parsed to valid Types.", () => {
        const virtualSource = source.replace(/from "\./gu, 'from "../../.');
        const virtualOptions = {
          ...options,
          filePath: `${options.filePath}/v/v.ts`,
        };
        const result =
          path.extname(sourcePath) === ".ts"
            ? tsParser.parseForESLint(virtualSource, virtualOptions)
            : vueParser.parseForESLint(virtualSource, virtualOptions);
        const actual = buildTypes(virtualSource, result as any).replace(
          /from "\.\.\/\.\.\/\./gu,
          'from ".'
        );
        const resultPath = sourcePath.replace(/source\.([a-z]+)$/u, "types.$1");
        const expected = fs.readFileSync(resultPath, "utf8");
        assert.strictEqual(actual, expected);
      });
    });
    describe(`'test/fixtures/vue/${name}/${path.basename(
      options.filePath
    )}/v/v.vue'`, () => {
      it("should be parsed to valid Types.", () => {
        const virtualSource = source.replace(/from "\./gu, 'from "../../.');
        const virtualOptions = {
          ...options,
          filePath: `${options.filePath}/v/v.vue`,
        };
        const result =
          path.extname(sourcePath) === ".ts"
            ? tsParser.parseForESLint(virtualSource, virtualOptions)
            : vueParser.parseForESLint(virtualSource, virtualOptions);
        const actual = buildTypes(virtualSource, result as any).replace(
          /from "\.\.\/\.\.\/\./gu,
          'from ".'
        );
        const resultPath = sourcePath.replace(/source\.([a-z]+)$/u, "types.$1");
        const expected = fs.readFileSync(resultPath, "utf8");
        assert.strictEqual(actual, expected);
      });
    });
  }
});
