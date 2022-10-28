<script lang="ts">
  import Foo from '../vue-component02/source.vue' // Foo: { name: string; props: { a: { type: NumberConstructor; default: number; }; }; }
  import {numberValue} from './number' // numberValue: 1, numberValue: 1
  let a = 1; // a: number
  export default ({
    components: { // components: { Foo: { name: string; props: { a: { type: NumberConstructor; default: number; }; }; }; }
      Foo // Foo: { name: string; props: { a: { type: NumberConstructor; default: number; }; }; }, Foo: { name: string; props: { a: { type: NumberConstructor; default: number; }; }; }
    },
    data() { // data: () => { a: number; numberValue: number; }
      return {
        a, // a: number, a: number
        numberValue // numberValue: number, numberValue: number
      }
    },
  })
</script>