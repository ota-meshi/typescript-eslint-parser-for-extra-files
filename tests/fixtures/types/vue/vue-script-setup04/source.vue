<script setup lang="ts">
import { watchEffect, ref } from "vue";
import Foo from "./component.vue";
type VMFoo = InstanceType<typeof Foo>;
let a = ref<VMFoo | null>(null);
watchEffect(() => {
  if (a.value) fn(a);
});

const comp = {} as VMFoo | undefined;
const r = comp?.exposeFn();
const r2 = r?.num();
console.log(r2);

function fn(vm: VMFoo) {
  const b = vm.exposeA;
  console.log(b);
  const c = vm.exposeFn();
  console.log(c);
  const d = vm.exposeFn2();
  console.log(d);
  const e = vm.exposeFn3();
  console.log(e);
}
</script>

<template>
  <Foo ref="a" />
</template>
