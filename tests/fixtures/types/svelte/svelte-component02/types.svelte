<script lang="ts" context="module">
  export type TypeFoo = string; // TypeFoo: string
</script>

<script lang="ts">
  export let a = 1; // a: number
  let foo: number = 42; // foo: number
</script>

{a} // a: number
{foo} // foo: number
