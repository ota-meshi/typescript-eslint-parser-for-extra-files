/**
 * @author Yosuke Ota
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import * as vueParser from "vue-eslint-parser";
import * as svelteParser from "svelte-eslint-parser";
import * as astroParser from "astro-eslint-parser";
import * as tsParser from "../../src";
import semver from "semver";
import assert from "assert";
import { iterateFixtures } from "./utils/fixtures";
import { buildTypes } from "./utils/utils";

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
  parser: tsParser,
};

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

    describe(`'test/fixtures/${name}/${path.basename(sourcePath)}'`, () => {
      it("should be parsed to valid Types.", () => {
        const result =
          path.extname(sourcePath) === ".vue"
            ? vueParser.parseForESLint(source, options)
            : path.extname(sourcePath) === ".svelte"
            ? svelteParser.parseForESLint(source, options)
            : path.extname(sourcePath) === ".astro"
            ? astroParser.parseForESLint(source, options)
            : path.extname(sourcePath) === ".ts"
            ? tsParser.parseForESLint(source, options)
            : vueParser.parseForESLint(source, options);
        const actual = buildTypes(source, result as any);
        const resultPath = sourcePath.replace(/source\.([a-z]+)$/u, "types.$1");

        if (process.argv.includes("--update")) {
          fs.writeFileSync(resultPath, actual);
        }
        if (!fs.existsSync(resultPath)) {
          fs.writeFileSync(resultPath, actual);
        }
        const expected = fs.readFileSync(resultPath, "utf8");

        try {
          assert.strictEqual(actual, expected);
        } catch (e) {
          fs.writeFileSync(
            sourcePath.replace(/source\.([a-z]+)$/u, "actual-types.$1"),
            actual
          );
          throw e;
        }
      });
    });
  }
});
