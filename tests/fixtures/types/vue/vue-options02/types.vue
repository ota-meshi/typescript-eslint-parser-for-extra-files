<script lang="ts">
export default {
  name: "FooBar", // name: string
  props: { // props: { a: { type: NumberConstructor; default: number; }; }
    a: { // a: { type: NumberConstructor; default: number; }
      type: Number, // type: NumberConstructor, Number: NumberConstructor
      default: 1, // default: number
    },
  },
};
</script>
