<template><div>

  <div id="dashboard">
    <button v-on:click="addTile('App01', {left:200, top:200, width: 200, height: 150})">Add a App01</button>
    <button v-on:click="addTile('TextMsg', {left:100, top:100, width: 200, height: 150})">Add a TextMsg</button>
    <TileArea v-bind:gridWpx="50" v-bind:gridHpx="50" v-bind:gridColNum="22" v-bind:gridRowNum="20">
    </TileArea>
  </div>

</div></template>

<script>
  import TileArea from './TileArea.vue';
  import { TileAreaEventBus } from '../js/TileAreaEB';
  
  export default {
    name: "DashBoard",
    components: {
      'TileArea': TileArea
    },
    methods: {
      addTile: function(name, pos){
        TileAreaEventBus.$emit('addTile', name, pos);
      }
    }
  }
</script>

<style scoped>

</style>