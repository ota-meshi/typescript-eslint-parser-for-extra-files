<script lang="ts">
  import Foo from "../svelte-component02/source.svelte";
  import { TypeFoo } from "../svelte-component02/source.svelte";
  import { numberValue } from "./number";
  let a: TypeFoo = "a";
  export let b: TypeFoo;
  export let foo: string;
  $: t = numberValue * 2;
</script>

<Foo>{a}{b}{foo}{t}</Foo>
