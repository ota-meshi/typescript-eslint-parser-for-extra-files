import type { ParserOptions } from "@typescript-eslint/parser";
import fs from "fs";
import { glob } from "glob";
import path from "path";

function syncWithGlob(pattern: string, cwd: string): string[] {
  return glob
    .sync(pattern, { cwd })
    .map((filePath) => path.resolve(cwd, filePath));
}

export function getProjectConfigFiles(options: ParserOptions): string[] {
  const tsconfigRootDir =
    typeof options.tsconfigRootDir === "string"
      ? options.tsconfigRootDir
      : process.cwd();

  if (options.project !== true) {
    return Array.isArray(options.project)
      ? options.project.flatMap((projectPattern: string) =>
          syncWithGlob(projectPattern, tsconfigRootDir),
        )
      : syncWithGlob(options.project!, tsconfigRootDir);
  }

  let directory = path.dirname(options.filePath!);
  const checkedDirectories = [directory];

  do {
    const tsconfigPath = path.join(directory, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      return [tsconfigPath];
    }

    directory = path.dirname(directory);
    checkedDirectories.push(directory);
  } while (directory.length > 1 && directory.length >= tsconfigRootDir.length);

  throw new Error(
    `project was set to \`true\` but couldn't find any tsconfig.json relative to '${options.filePath}' within '${tsconfigRootDir}'.`,
  );
}
