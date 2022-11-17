<script setup lang="ts">
let exposeA = $ref(1);

type Ret = {
  num: () => number;
};

// eslint-disable-next-line func-style -- ignore
let exposeFn: () => Ret | null = function exposeFn(): Ret {
  return { num: () => 42 };
};

exposeFn = () => null;

function exposeFn2(): number {
  return 42;
}

defineExpose({
  exposeA,
  exposeFn() {
    return exposeFn();
  },
  exposeFn3() {
    return exposeFn2();
  },
});
</script>

<template>
  <div>{{ exposeA }}</div>
</template>
