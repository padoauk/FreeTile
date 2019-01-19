# FreeTiles
## Overview
FreeTile is a layout framework on Vue.js. The main components of FreeTile
are TileAera.vue and Tile.vue. On TileArea's region, each tile can be moved
or re-sized by the normal mouse actions with a restriction that any tiles
are placed on grid and cannot overlap with each other. 

Tile is the class of elements placed on TileArea's area. Tile is composed
of header, slot and footer. A Vue.js component can be inserted to the slot.
Only the header and footer are draggable for move or resize. On the slot's
area, mouse interactions are not controlled by Tile or TileArea but by the
slot component.

## Example
Following, DashBoard.vue, is a sample of using FreeTile. With the props, size
of TileArea is gridWpx times gridColNum and height of gridHpx times gridRowNum.
The event 'addTile' can be emitted to the TileAreaEventBus.

### DashBoard.vue

    <template><div>
      <div id="dashboard">
        <button v-on:click="addTile('TextMsg', {left:100, top:100, width: 200, height: 150})">Add a TextMsg</button>
        <TileArea gridWpx="50" gridHpx="50" gridColNum="22" gridRowNum="20">
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

### TileApps.json

    // path is relative to TileArea.vue
    [
      {"name": "TextMsg", "path":  "../sample/vue"}
    ]

The components which will be created in the Tile's slots, TextMsg in the above
sample, should be declared in TileApps.json and compiled with the file.

## Interface between App component and TileArea
To have a Vue.js component (app) in the Tile's slot, the app needs to support
the following slots and props. 

### App's props
#### tileAreaId
Prop of 'tileAreaId' is an unique id in Number for Tile's slot component defined
by TileArea. The slot compoent must keep this prop and return the value in the
events in certain manner.

#### width and height
Prop of 'width' and 'height' are width and height in Number of the slot component.
The slot component must implement adjusting its size with this props. 

### App's props
Tile app should respond to the following props.

- **width** width of Tile App's (visible) area in pixel
- **height** height of Tile App's (visible) area in pixel 

