import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: ["node16"],
  external: [/package.json/],
  outDir: "lib",
  skipNodeModulesBundle: true,
  publint: { strict: true, pack: "npm" },
  unused: true,
});
