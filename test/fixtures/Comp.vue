<template>
  <button @click="count++">this is {{ count }}</button>
  <Child/>
</template>

<script>
import Child from './Child.vue'

export default {
  components: { Child },
  setup() {
    return {
      count: 0
    }
  }
}
</script>
