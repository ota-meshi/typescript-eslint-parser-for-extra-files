import type * as compilerSync from "astrojs-compiler-sync";
import type { ExtraFileTransformerContext } from "../ts";

export function transformForAstro(
  code: string,
  context: ExtraFileTransformerContext,
): string {
  if (context.current) {
    return code;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
  const compiler: typeof compilerSync = require("astrojs-compiler-sync");
  const result = compiler.convertToTSX(code, {
    sourcefile: context.filePath,
  });

  return result.code;
}
