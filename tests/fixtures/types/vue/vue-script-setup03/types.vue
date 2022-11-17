<script setup lang="ts">
import { watchEffect } from "vue"; // watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle, watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle
import Foo from "./component.vue"; // Foo: DefineComponent<{}, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 4 more ..., {}>
type VMFoo = InstanceType<typeof Foo>; // VMFoo: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ..., InstanceType: InstanceType<T>, Foo: DefineComponent<{}, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 4 more ..., {}>
let a = $ref<VMFoo | null>(null); // a: any, $ref<VMFoo | null>(null): any
watchEffect(() => { // watchEffect(() => { if (a) fn(a); }): WatchStopHandle
  if (a) fn(a);
});

const comp = {} as VMFoo | undefined; // comp: ({ $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) =>..., VMFoo: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ...
const r = comp?.exposeFn(); // r: Ret | null | undefined, comp?.exposeFn(): Ret | null | undefined
const r2 = r?.num(); // r2: number | undefined, r?.num(): number | undefined
console.log(r2); // console.log(r2): void

function fn(vm: VMFoo) { // fn: (vm: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R..., vm: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ...
  const b = vm.exposeA; // b: number, vm.exposeA: number
  console.log(b); // console.log(b): void
  const c = vm.exposeFn(); // c: Ret | null, vm.exposeFn(): Ret | null
  console.log(c); // console.log(c): void
  const d = vm.exposeFn2(); // d: number, vm.exposeFn2(): number
  console.log(d); // console.log(d): void
  const e = vm.exposeFn3(); // e: any, vm.exposeFn3(): any
  console.log(e); // console.log(e): void
}
</script>

<template>
  <Foo ref="a" />
</template>
