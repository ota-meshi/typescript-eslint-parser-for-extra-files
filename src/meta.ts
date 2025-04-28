import { name as pkgName, version } from "../package.json";
import { TSESLint } from "@typescript-eslint/utils";

const meta: TSESLint.FlatConfig.PluginMeta = { name: pkgName, version };

export default meta;

export const name: string = pkgName;
