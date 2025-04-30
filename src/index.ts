import type { ParserOptions } from "@typescript-eslint/parser";
import type { ProgramOptions } from "./ts";
import { TSServiceManager } from "./ts";
import * as tsEslintParser from "@typescript-eslint/parser";
import { getProjectConfigFiles } from "./utils/get-project-config-files";
import { resolveProjectList } from "./utils/resolve-project-list";
export { default as meta, name } from "./meta";

const DEFAULT_EXTRA_FILE_EXTENSIONS = [".vue", ".svelte", ".astro"];
const tsServiceManager = new TSServiceManager();

export function parseForESLint(
  code: string,
  options: ParserOptions = {},
): ReturnType<typeof tsEslintParser.parseForESLint> {
  if (!options.project) {
    return tsEslintParser.parseForESLint(code, options);
  }
  const extraFileExtensions =
    options.extraFileExtensions || DEFAULT_EXTRA_FILE_EXTENSIONS;
  const programs = [];
  for (const option of iterateOptions(options)) {
    programs.push(tsServiceManager.getProgram(code, option));
  }
  const filePath = options.filePath;
  const parserOptions = {
    ...options,
    filePath,
    programs,
    extraFileExtensions,
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
      "Specify `parserOptions.project`. Otherwise there is no point in using this parser.",
    );
  }
  const tsconfigRootDir =
    typeof options.tsconfigRootDir === "string"
      ? options.tsconfigRootDir
      : process.cwd();

  for (const project of resolveProjectList({
    project: getProjectConfigFiles({
      project: options.project,
      tsconfigRootDir,
      filePath: options.filePath,
    }),
    projectFolderIgnoreList: options.projectFolderIgnoreList,
    tsconfigRootDir,
  })) {
    yield {
      project,
      filePath: options.filePath,
      extraFileExtensions:
        options.extraFileExtensions || DEFAULT_EXTRA_FILE_EXTENSIONS,
    };
  }
}
