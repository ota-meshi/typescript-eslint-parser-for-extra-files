import fs from "fs";
import path from "path";

export function iterateFixtures(baseDir: string): Iterable<{
  name: string;
  filePath: string;
  sourcePath: string;
  tsconfigPath: string;
}> {
  const tsconfigPathCandidate = path.join(baseDir, `tsconfig.json`);
  const tsconfigPath = fs.existsSync(tsconfigPathCandidate)
    ? tsconfigPathCandidate
    : "";
  return iterateFixturesWithTsConfig(baseDir, tsconfigPath);
}

function* iterateFixturesWithTsConfig(
  baseDir: string,
  parentTsconfigPath: string,
): Iterable<{
  name: string;
  filePath: string;
  sourcePath: string;
  tsconfigPath: string;
}> {
  for (const filename of fs.readdirSync(baseDir)) {
    const filePath = path.join(baseDir, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const sourcePath = [
        path.join(filePath, `source.vue`),
        path.join(filePath, `source.ts`),
        path.join(filePath, `source.svelte`),
        path.join(filePath, `source.astro`),
      ].find((p) => fs.existsSync(p));
      const tsconfigPathCandidate = path.join(filePath, `tsconfig.json`);
      const tsconfigPath = fs.existsSync(tsconfigPathCandidate)
        ? tsconfigPathCandidate
        : parentTsconfigPath;
      if (sourcePath && tsconfigPath) {
        yield {
          name: filename,
          filePath,
          sourcePath,
          tsconfigPath,
        };
      } else {
        for (const nest of iterateFixturesWithTsConfig(
          filePath,
          tsconfigPath,
        )) {
          yield {
            name: `${filename}/${nest.name}`,
            filePath: nest.filePath,
            sourcePath: nest.sourcePath,
            tsconfigPath: nest.tsconfigPath,
          };
        }
      }
    }
  }
}
