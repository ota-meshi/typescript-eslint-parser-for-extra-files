import A from "../astro-component01/source.astro"; // A: (_props: Props) => any
import B from "../astro-component02/source.astro"; // B: (_props: Props) => any
import { TypeFoo } from "../astro-component02/source.astro"; // TypeFoo: any, TypeFoo: any
import * as C from "../astro-simple-types/source.astro"; // C: typeof import("/tests/fixtures/types/astro/astro-simple-types/source.astro")
export let a: TypeFoo; // a: string
export { A, B, C, TypeFoo }; // A: (_props: Props) => any, A: (_props: Props) => any, B: (_props: Props) => any, B: (_props: Props) => any, C: typeof import("/tests/fixtures/types/astro/astro-simple-types/source.astro"), C: typeof import("/tests/fixtures/types/astro/astro-simple-types/source.astro"), TypeFoo: any, TypeFoo: any
