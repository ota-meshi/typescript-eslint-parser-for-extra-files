import path from "path";
import type { ExtraFileTransformerContext } from "../ts";
import { transformForVue } from "./vue";
import { transformForSvelte } from "./svelte";
import { transformForAstro } from "./astro";

export function transformExtraFile(
  code: string,
  context: ExtraFileTransformerContext,
): string {
  const ext = path.extname(context.filePath);
  const transform =
    ext === ".vue"
      ? transformForVue
      : ext === ".svelte"
      ? transformForSvelte
      : ext === ".astro"
      ? transformForAstro
      : () => code;
  try {
    return transform(code, context);
  } catch {
    // ignore
  }

  return code;
}
