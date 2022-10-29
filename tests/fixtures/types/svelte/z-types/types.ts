import A from "../svelte-component01/source.svelte"; // A: typeof Source__SvelteComponent_
import B from "../svelte-component02/source.svelte"; // B: typeof Source__SvelteComponent_
import { TypeFoo } from "../svelte-component02/source.svelte"; // TypeFoo: any, TypeFoo: any
import * as C from "../svelte-simple-types/source.svelte"; // C: typeof import("/Users/yosuke/git/typescript-eslint-parser-for-extra-files/tests/fixtures/types/svelte/svelte-simple-types/source.svelte")
export let a: TypeFoo; // a: string
export { A, B, C, TypeFoo }; // A: typeof Source__SvelteComponent_, A: typeof Source__SvelteComponent_, B: typeof Source__SvelteComponent_, B: typeof Source__SvelteComponent_, C: typeof import("/Users/yosuke/git/typescript-eslint-parser-for-extra-files/tests/fixtures/types/svelte/svelte-simple-types/source.svelte"), C: typeof import("/Users/yosuke/git/typescript-eslint-parser-for-extra-files/tests/fixtures/types/svelte/svelte-simple-types/source.svelte"), TypeFoo: any, TypeFoo: any
