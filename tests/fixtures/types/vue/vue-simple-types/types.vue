<script lang="ts">
let a = 1; // a: number
export default {
  name: "MyComponent", // name: string
  data() { // data: () => { a: number; }
    return { a }; // a: number, a: number
  },
};
</script>
