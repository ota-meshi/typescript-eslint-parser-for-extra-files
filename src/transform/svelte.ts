import type * as Svelte2tsx from "svelte2tsx";
import type { ExtraFileTransformerContext } from "../ts";
export function transformForSvelte(
  code: string,
  context: ExtraFileTransformerContext
): string {
  if (context.current) {
    return code;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
  const svelte2tsx: typeof Svelte2tsx = require("svelte2tsx");
  const result = svelte2tsx.svelte2tsx(code, {
    filename: context.filePath,
  });

  return `/// <reference types="svelte2tsx/svelte-shims" />
  
${result.code}`;
}
