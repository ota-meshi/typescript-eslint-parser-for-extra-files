<script lang="ts">
export default {
  name: "MyComponent", // name: string
};
</script>

<script setup lang="ts">
import Foo from "../vue-script-setup02/source.vue"; // Foo: DefineComponent<ExtractPropTypes<{ a: { type: NumberConstructor; default: number; }; }>, { foo: number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., any>
import { TypeFoo } from "../vue-script-setup02/source.vue"; // TypeFoo: any, TypeFoo: any
import { numberValue } from "./number"; // numberValue: 1, numberValue: 1
import { ref } from "vue"; // ref: { <T>(value: T): [T] extends [Ref<any, any>] ? IfAny<T, Ref<T, T>, T> : Ref<UnwrapRef<T>, T | UnwrapRef<T>>; <T = any>(): Ref<...>; }, ref: { <T>(value: T): [T] extends [Ref<any, any>] ? IfAny<T, Ref<T, T>, T> : Ref<UnwrapRef<T>, T | UnwrapRef<T>>; <T = any>(): Ref<...>; }
let a: TypeFoo = ref(1); // a: string, ref(1): Ref<number, number>
let b: TypeFoo; // b: string
defineProps<{ foo: string }>(); // defineProps<{ foo: string }>(): DefineProps<LooseRequired<{ foo: string; }>, never>
console.log(numberValue); // console.log(numberValue): void
</script>

<template>
  <Foo>{{ a }}{{ b }}</Foo>
</template>
