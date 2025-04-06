<script setup lang="ts">
import { watchEffect, ref } from "vue"; // watchEffect: (effect: WatchEffect, options?: WatchEffectOptions | undefined) => WatchHandle, watchEffect: (effect: WatchEffect, options?: WatchEffectOptions | undefined) => WatchHandle, ref: { <T>(value: T): [T] extends [Ref<any, any>] ? IfAny<T, Ref<T, T>, T> : Ref<UnwrapRef<T>, T | UnwrapRef<T>>; <T = any>(): Ref<...>; }, ref: { <T>(value: T): [T] extends [Ref<any, any>] ? IfAny<T, Ref<T, T>, T> : Ref<UnwrapRef<T>, T | UnwrapRef<T>>; <T = any>(): Ref<...>; }
import Foo from "./component.vue"; // Foo: DefineComponent<{}, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 12 more ..., any>
type VMFoo = InstanceType<typeof Foo>; // VMFoo: CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}>, InstanceType: InstanceType<T>, Foo: DefineComponent<{}, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 12 more ..., any>
let a = ref<VMFoo | null>(null); // a: Ref<CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}> | null, CreateComponentPublicInstanceWithMixins<...> | null>, ref<VMFoo | null>(null): Ref<CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}> | null, CreateComponentPublicInstanceWithMixins<...> | null>
watchEffect(() => { // watchEffect(() => { if (a.value) fn(a); }): WatchHandle
  if (a.value) fn(a);
});

const comp = {} as VMFoo | undefined; // comp: CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}> | undefined, VMFoo: CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}>
const r = comp?.exposeFn(); // r: Ret | null | undefined, comp?.exposeFn(): Ret | null | undefined
const r2 = r?.num(); // r2: number | undefined, r?.num(): number | undefined
console.log(r2); // console.log(r2): void

function fn(vm: VMFoo) { // fn: (vm: CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}>) => void, vm: CreateComponentPublicInstanceWithMixins<ToResolvedProps<{}, {}>, { exposeA: Ref<number, number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 19 more ..., {}>
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
