<script lang="ts">
  import Foo from '../vue-component02/source.vue'
  import {numberValue} from './number'
  let a = 1;
  export default ({
    components: {
      Foo
    },
    data() {
      return {
        a,
        numberValue
      }
    },
  })
</script>