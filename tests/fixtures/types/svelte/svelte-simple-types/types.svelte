<script lang="ts" context="module">
  export type Foo = string; // Foo: string
  let hello = "hello"; // hello: string
</script>

<script lang="ts">
  export let world = "name"; // world: string
</script>

<h1>{hello} {world}</h1> // hello: string, world: string
