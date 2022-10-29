import type { ParserOptions } from "@typescript-eslint/parser";
import type { ProgramOptions } from "./ts";
import { TSServiceManager } from "./ts";
import * as tsEslintParser from "@typescript-eslint/parser";

const DEFAULT_EXTRA_FILE_EXTENSIONS = [".vue", ".svelte", ".astro"];
const tsServiceManager = new TSServiceManager();

export function parseForESLint(
  code: string,
  options: ParserOptions = {}
): ReturnType<typeof tsEslintParser.parseForESLint> {
  const programs = [];
  for (const option of iterateOptions(options)) {
    programs.push(tsServiceManager.getProgram(code, option));
  }
  const parserOptions = {
    ...options,
    programs,
    extraFileExtensions:
      options.extraFileExtensions || DEFAULT_EXTRA_FILE_EXTENSIONS,
  };
  return tsEslintParser.parseForESLint(code, parserOptions as any);
}

function* iterateOptions(options: ParserOptions): Iterable<ProgramOptions> {
  if (!options) {
    throw new Error("`parserOptions` is required.");
  }
  if (!options.filePath) {
    throw new Error("`filePath` is required.");
  }
  if (!options.project) {
    throw new Error(
      "Specify `parserOptions.project`. Otherwise there is no point in using this parser."
    );
  }
  for (const project of Array.isArray(options.project)
    ? options.project
    : [options.project]) {
    yield {
      project,
      filePath: options.filePath,
      extraFileExtensions:
        options.extraFileExtensions || DEFAULT_EXTRA_FILE_EXTENSIONS,
    };
  }
}
