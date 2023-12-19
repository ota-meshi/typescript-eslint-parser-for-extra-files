<script setup lang="ts">
import { watchEffect, ref } from "vue"; // watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle, watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle, ref: { <T>(value: T): Ref<UnwrapRef<T>>; <T = any>(): Ref<T | undefined>; }, ref: { <T>(value: T): Ref<UnwrapRef<T>>; <T = any>(): Ref<T | undefined>; }
import Foo from "./component.vue"; // Foo: { new (...args: any[]): { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (a...
type VMFoo = InstanceType<typeof Foo>; // VMFoo: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ..., InstanceType: InstanceType<T>, Foo: { new (...args: any[]): { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (a...
let a = ref<VMFoo | null>(null); // a: Ref<({ $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R..., ref<VMFoo | null>(null): Ref<({ $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R...
watchEffect(() => { // watchEffect(() => { if (a.value) fn(a); }): WatchStopHandle
  if (a.value) fn(a);
});

const comp = {} as VMFoo | undefined; // comp: ({ $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) =>..., VMFoo: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ...
const r = comp?.exposeFn(); // r: { num: () => number; } | null | undefined, comp?.exposeFn(): { num: () => number; } | null | undefined
const r2 = r?.num(); // r2: number | undefined, r?.num(): number | undefined
console.log(r2); // console.log(r2): void

function fn(vm: VMFoo) { // fn: (vm: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R..., vm: { $: ComponentInternalInstance; $data: {}; $props: Partial<{}> & Omit<Readonly<ExtractPropTypes<{}>> & VNodeProps & AllowedComponentProps & ComponentCustomProps, never>; ... 10 more ...; $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (args_0: R, args_1: R) => ...
  const b = vm.exposeA; // b: any, vm.exposeA: any
  console.log(b); // console.log(b): void
  const c = vm.exposeFn(); // c: { num: () => number; } | null, vm.exposeFn(): { num: () => number; } | null
  console.log(c); // console.log(c): void
  const d = vm.exposeFn2(); // d: any, vm.exposeFn2(): any
  console.log(d); // console.log(d): void
  const e = vm.exposeFn3(); // e: number, vm.exposeFn3(): number
  console.log(e); // console.log(e): void
}
</script>

<template>
  <Foo ref="a" />
</template>
