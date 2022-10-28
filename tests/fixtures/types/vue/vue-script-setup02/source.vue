<script setup lang="ts">
export type TypeFoo = string;
defineProps({
  a: {
    type: Number,
    default: 1,
  },
});
let foo: number = 42;
</script>
<template>{{ foo }}</template>
