import { name as pkgName, version } from "../package.json";

const meta: { name: string; version: string } = { name: pkgName, version };
export default meta;

export const name: string = pkgName;
