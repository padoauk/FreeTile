<template>
  <div>
    {{msg}} Hello World !
  </div>
</template>

<script>
  export default {
    name: "TextMsg",

    props: {
      msg: {
        type: String,
        default: ""
      }
    }
  }
</script>

<style scoped>

</style>