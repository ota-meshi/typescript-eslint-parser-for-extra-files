<script setup lang="ts">
import { watchEffect, ref } from "vue"; // watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle, watchEffect: (effect: WatchEffect, options?: WatchOptionsBase | undefined) => WatchStopHandle, ref: { <T>(value: T): Ref<UnwrapRef<T>>; <T = any>(): Ref<T | undefined>; }, ref: { <T>(value: T): Ref<UnwrapRef<T>>; <T = any>(): Ref<T | undefined>; }
import Foo from "./component.vue"; // Foo: DefineComponent<{}, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 5 more ..., {}>
type VMFoo = InstanceType<typeof Foo>; // VMFoo: CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}>, InstanceType: InstanceType<T>, Foo: DefineComponent<{}, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, ... 5 more ..., {}>
let a = ref<VMFoo | null>(null); // a: Ref<CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}> | null>, ref<VMFoo | null>(null): Ref<CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}> | null>
watchEffect(() => { // watchEffect(() => { if (a.value) fn(a); }): WatchStopHandle
  if (a.value) fn(a);
});

const comp = {} as VMFoo | undefined; // comp: CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}> | undefined, VMFoo: CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}>
const r = comp?.exposeFn(); // r: Ret | null | undefined, comp?.exposeFn(): Ret | null | undefined
const r2 = r?.num(); // r2: number | undefined, r?.num(): number | undefined
console.log(r2); // console.log(r2): void

function fn(vm: VMFoo) { // fn: (vm: CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}>) => void, vm: CreateComponentPublicInstance<Readonly<ExtractPropTypes<{}>>, { exposeA: Ref<number>; exposeFn: () => Ret | null; exposeFn2: () => number; }, {}, {}, {}, ComponentOptionsMixin, ... 13 more ..., {}>
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
