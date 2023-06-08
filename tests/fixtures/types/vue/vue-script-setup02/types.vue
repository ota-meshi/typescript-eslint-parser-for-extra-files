<script setup lang="ts">
export type TypeFoo = string; // TypeFoo: string
defineProps({ // defineProps({ a: { type: Number, default: 1, }, }): { readonly a: number; }
  a: {
    type: Number,
    default: 1,
  },
});
let foo: number = 42; // foo: number
</script>
<template>{{ foo }}</template>
