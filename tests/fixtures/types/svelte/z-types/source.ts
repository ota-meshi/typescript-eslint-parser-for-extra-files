import A from "../svelte-component01/source.svelte";
import B from "../svelte-component02/source.svelte";
import { TypeFoo } from "../svelte-component02/source.svelte";
import * as C from "../svelte-simple-types/source.svelte";
export let a: TypeFoo;
export { A, B, C, TypeFoo };
