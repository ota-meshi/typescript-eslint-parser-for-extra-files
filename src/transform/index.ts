import path from "path";
import type { ExtraFileTransformerContext } from "../ts";
import { transformForVue } from "./vue";
import { transformForSvelte } from "./svelte";

export function transformExtraFile(
  code: string,
  context: ExtraFileTransformerContext
): string {
  const ext = path.extname(context.filePath);
  if (ext === ".vue") {
    try {
      return transformForVue(code, context);
    } catch {
      // ignore
    }
  }
  if (ext === ".svelte") {
    try {
      return transformForSvelte(code, context);
    } catch {
      // ignore
    }
  }

  return code;
}
