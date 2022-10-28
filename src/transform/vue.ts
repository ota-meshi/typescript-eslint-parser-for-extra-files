import type * as compilerSfc from "vue/compiler-sfc";
import type { ExtraFileTransformerContext } from "../ts";
export function transformForVue(
  code: string,
  context: ExtraFileTransformerContext
): string {
  if (context.current) {
    return code;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
  const compiler: typeof compilerSfc = require("vue/compiler-sfc");
  const result = compiler.parse(code);
  const compiled = compiler.compileScript(result.descriptor, { id: "id" });

  return compiled.content;
}
