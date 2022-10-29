<script lang="ts">
  import Foo from "../svelte-component02/source.svelte"; // Foo: typeof Source__SvelteComponent_
  import { TypeFoo } from "../svelte-component02/source.svelte"; // TypeFoo: any, TypeFoo: any
  import { numberValue } from "./number"; // numberValue: 1, numberValue: 1
  let a: TypeFoo = "a"; // a: string
  export let b: TypeFoo; // b: string
  export let foo: string; // foo: string
  $: t = numberValue * 2; // $: any, t: number, numberValue: 1
</script>

<Foo>{a}{b}{foo}{t}</Foo> // Foo: typeof Source__SvelteComponent_, a: string, b: string, foo: string, t: number
