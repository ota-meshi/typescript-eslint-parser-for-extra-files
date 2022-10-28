import type { ExtraFileTransformer } from "../ts";
import { transformForVue } from "./vue";

export function getExtraFileTransformer(
  ext: string
): ExtraFileTransformer | null {
  if (ext === ".vue") {
    return transformForVue;
  }

  return null;
}
