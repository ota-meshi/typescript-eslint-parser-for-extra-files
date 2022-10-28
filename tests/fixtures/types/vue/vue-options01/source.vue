<script lang="ts">
import Foo from "../vue-options02/source.vue";
import { numberValue } from "./number";
let a = 1;

export default {
  name: "MyComponent",
  components: {
    Foo,
  },
  data() {
    return {
      a,
      numberValue,
    };
  },
};
</script>
