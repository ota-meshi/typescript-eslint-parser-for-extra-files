<script lang="ts">
export default {
  name: "MyComponent",
};
</script>

<script setup lang="ts">
import Foo from "../vue-script-setup02/source.vue";
import { TypeFoo } from "../vue-script-setup02/source.vue";
import { numberValue } from "./number";
let a: TypeFoo = $ref(1);
let b: TypeFoo;
defineProps<{ foo: string }>();
console.log(numberValue);
</script>

<template>
  <Foo>{{ a }}{{ b }}</Foo>
</template>
