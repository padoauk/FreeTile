<!--
 Copyright (C) 2019, Toshinao Ishii <padoauk@gmail.com>
-->

<!-- TileArea.vue -->

<template><div>
  <div class="tile-area" v-bind:style="styles" v-bind:id="areaId" v-on:dragover="dragover">
    <component is="tile"
               v-for="tile in tiles" v-bind:key="tile.tileAreaId"
               class="dragitem"
               v-on:dragstart="dragstart"
               v-on:dragend="dragend"
               v-on:drop="drop"
               v-on:tileId="registerTileId"
               v-on:tileSzChanged="tileSzChanged"
               v-on:doTileSzCheck="doTileSzCheck"
               v-on:delTile="delTile"
               v-bind:showTile="tile.show"
               v-bind:tileAreaId="tile.tileAreaId"
               v-bind:width="tile.xsz_px" v-bind:height="tile.ysz_px"
               v-bind:gridWpx="gridWpx" v-bind:gridHpx="gridHpx"
               v-bind:tileSzCheck="tileSzCheck"
               v-bind:style="defaultTileStyle">
      <div>
        <component v-bind:is="tile.component"
                   v-bind:tileAreaId="tile.tileAreaId" v-bind:width="tile.slot.xsz_px" v-bind:height="tile.slot.ysz_px"
                   v-on:szChanged="szChanged">
        </component>
      </div>
    </component>
  </div>

</div></template>

<script>
  import { Idxx } from '../js/util';
  import { TileAreaEventBus } from '../js/TileAreaEB';
  import Tile from './Tile.vue';

  /* Application Components should be registered in TileApps.json */
  import TileApps from './TileApps.json';
  const componentsLoaded = {
    'Tile': Tile
  };
  TileApps.forEach((app)=>{
    componentsLoaded[app.name] = () => {
      return import(`${app.path}/${app.name}.vue`);
    }
  });

  export default {
    name: "FreeTiles",

    components: componentsLoaded,

    props: {
      /** grid parameters */
      gridWpx: {
        type: Number,
        default: 50,
        validator: function (value) {
          return 0 <= value && value === parseInt(value)
        }
      },
      gridHpx: {
        type: Number,
        default: 50,
        validator: function (value) {
          return 0 <= value && value === parseInt(value)
        }
      },
      gridColNum: {
        type: Number,
        default: 20,
        validator: function (value) {
          return 0 <= value && value === parseInt(value)
        }
      },
      gridRowNum: {
        type: Number,
        default: 14,
        validator: function (value) {
          return 0 <= value && value === parseInt(value)
        }
      }
    },

    data() {
      return {
        /** TileArea Geometry */
        geo: {
          abs: {left: undefined, right:undefined, top: undefined, bottom:undefined},
          width: undefined,
          height: undefined
        },
        /** tiles management */
        lastTileId: 0,
        tiles: [], // see comments in addTile() for keys of elements
        areaId: 'area' + Idxx(),
        defaultTileStyle: 'width: 150px; height: 150px;',
        /** grid constant */
        marginH: 10,
        marginV: 10,
        /** DnD management */
        canDrag: true,
        dragging: {},
        /** resize management */
        tileSzCheck: true
      }
    },
    
    computed: {
      width() {
        return parseInt(this.gridWpx) * parseInt(this.gridColNum);
      },
      height() {
        return parseInt(this.gridHpx) * parseInt(this.gridRowNum);
      },
      styles() {
        return {
          '--tile-area-width':  this.width + 'px',
          '--tile-area-height': this.height + 'px',
          '--tile-area-margin-h': this.marginH + 'px',
          '--tile-area-margin-v': this.marginV + 'px',
          '--tile-area-gridW': this.gridWpx + 'px',
          '--tile-area-gridH': this.gridHpx + 'px',
          '--tile-area-col-num': 'repeat(' + this.gridColNum + ', ' + this.gridWpx + 'px)',
          '--tile-area-row-num': 'repeat(' + this.gridRowNum + ', ' + this.gridHpx + 'px)'
        }
      }
    },
    methods: {
      disableDrag: function(){
        this.canDrag = false;
        return;
      },
      enableDrag: function(){
        this.canDrag = true;
        return;
      },
      /**
       * @param {Number} areaId - the tileAreId of Tiles defined when in addTime()
       * @return {Object} elemenet in tiles[] that is associated with areaId
       */
      findTileByAreaId: function(areaId){
        let tile = null;
        for(let i=0; i<this.tiles.length; i++){
          if(this.tiles[i].tileAreaId === areaId){
            tile = this.tiles[i];
            break;
          }
        }
        return tile;
      },
      /**
       * place tile to the specified position
       * @param {Object} tile - target of placing
       * @param {Object} pos - position to place the target tile represented relative to TileArea
       * @property {Number} pos.left   - left of the tile. if undefined, tile.pos.left is used.
       * @property {Number} pos.top    - top of the tile. if undefined, tile.pos.top is used.
       * @property {Number} pos.width  - width of the tile. if undefined, (tile.pos.right - tile.pos.left) is used
       * @property {Number} pos.height - height of the tile. if undefined, (tile.pos.bottom - tile.pos.top) is used
       */
      place: function(tile, pos){
        if( pos === undefined ){
          return;
        }
        if( tile === undefined || tile.tileId === undefined ){
          console.log('Woops! strange tile');
          return;
        }

        pos.left = (pos.left === undefined) ? tile.pos.left : pos.left;
        pos.top  = (pos.top  === undefined) ? tile.pos.top  : pos.top;
        pos.width  = (pos.width  === undefined) ? (tile.pos.right - tile.pos.left) : pos.width;
        pos.height = (pos.height === undefined) ? (tile.pos.bottom - tile.pos.top) : pos.height;

        const div = document.getElementById(tile.tileId);
        if(div === undefined){
          console.log('Woops! cannot find DOM of ' + tile.tileId);
          return;
        }

        const gw = parseInt(this.gridWpx);
        const gh = parseInt(this.gridHpx);
        const gc = parseInt(this.gridColNum);
        const gr = parseInt(this.gridRowNum);
        // calculate colStart, colEnd, colSz, rowStart, rowEnd and rowSz
        const cst = parseInt( pos.left / gw ) + 1;
        const rst = parseInt( pos.top  / gh ) + 1;
        // range of colStart is in [1 , gridColNum-2]
        const colStart = (cst < 1) ? 1 : ((gc < cst) ? gc : cst);
        // range of rowStart is in [1 , gridRowNum-2]
        const rowStart = (rst < 1) ? 1 : ((gr < rst) ? gr : rst);
        
        const csz = parseInt( pos.width / gw );
        const rsz = parseInt( pos.height / gh );
        const colEnd = (gc < colStart + csz) ? gc + 1 : colStart + csz;
        const rowEnd = (gr < rowStart + rsz) ? gr + 1 : rowStart + rsz;
        const colSz = colEnd - colStart;
        const rowSz = rowEnd - rowStart;

        tile.xsz_px = colSz * gw;
        tile.ysz_px = rowSz * gh;
        // notice: col and row start at 1
        tile.pos.left = (colStart-1) * gw;
        tile.pos.top  = (rowStart-1) * gh;
        tile.pos.right  = (colEnd-1) * gw;
        tile.pos.bottom = (rowEnd-1) * gh;
        tile.slot.xsz_px = tile.xsz_px;
        tile.slot.ysz_px = tile.ysz_px - tile.headerHeight - tile.footerHeight;

        div.style['grid-column-start'] = colStart;
        div.style['grid-column-end'] = colEnd;
        div.style['grid-row-start'] = rowStart;
        div.style['grid-row-end'] = rowEnd;
        div.style['width']  = tile.xsz_px + 'px';
        div.style['height'] = tile.ysz_px + 'px';
        div.style['padding'] = '0px';
        div.style['margin'] = '0px';

        const r = div.getBoundingClientRect();

        return;
      },
      /**
       * calculate and return whether the tile's (new) position has overlap with some other tile
       * @param {Object} tile - the tile to inspect
       * @param {Number} left - left of the (new) position relative to TileArea
       */
      hasOverlap: function(tile, left, top, right, bottom){
        let hasOverlap = false;
        this.tiles.forEach((t)=>{
          if(tile.tileId === t.tileId){
            return;
          }
          if( t.pos.right <= left || right <= t.pos.left ){
            return;
          }
          if( bottom <= t.pos.top || t.pos.bottom <= top ){
            return;
          }
          hasOverlap = true;
        });
        
        return hasOverlap;
      },
      /**
       * register on drag start geometry and start dragging
       * @param {dragstart} evt - start event
       */
      dragstart: function(evt) {
        evt.stopPropagation();
        if (!this.canDrag) {
          return;
        }
        // todo[1] set (some) data to evt.dataTransfer
        evt.dataTransfer.setData("text", evt.target.id);

        // todo[2] register id of the in-dragging object
        this.dragging.id = evt.target.id;
        for (let i = 0; i < this.tiles.length; i++) {
          if (this.tiles[i].tileId === this.dragging.id) {
            this.dragging.tile = this.tiles[i];
            break;
          }
        }

        // todo[3] register geometry of dragging div and the mouse position
        const rect = evt.target.getBoundingClientRect();
        const ex = evt.pageX;
        const ey = evt.pageY;
        const aleft = rect.left + window.scrollX;
        const atop = rect.top + window.scrollY;
        // (ex, ey) is absolute position, (rect.left, rect.top) is also absolute
        // (dx,dy) is difference from upper left of the dragging box and the mouse position
        this.dragging.dx = ex - aleft;
        this.dragging.dy = ey - atop;
        this.dragging.rect = rect;
        this.dragging.start = {x: ex, y: ey, rect: rect};

        this.dragging.hasOverlap = false;

        // todo[4] create div for colorize position of in-dragging div (box)
        let box = document.createElement('div');
        this.dragging.box = box;
        box.style['position'] = 'absolute';
        box.style['width'] = rect.width + 'px';
        box.style['height'] = rect.height + 'px';
        box.style['padding'] = '0px';
        box.style['margin'] = '0px';
        box.style['left'] = rect.left + 'px'; // box is in absolute position
        box.style['top'] = rect.top + 'px';
        box.style['background'] = "rgba(255,255,255,0.4);";
        // Notice:
        // if box is appended not to ext.target but to the TileArea (document.getElementById(this.areaId)),
        // drag is ended just after that in WebKit based browsers (ex, Chrome or Safari)
        evt.target.appendChild(box);

        // On chrome:
        // The dragImage includes divs inside the drag target so that dragImage size can exceeds the tile.
        // Therefore, the `box`, whose size is just the tile's size and has nothing inside, should be set as dragImage.
        // Strangly, the result dragImage includes image of the parent of `box`.
        if (navigator.userAgent.toLocaleLowerCase().match(/(chrome)/)) {
          evt.dataTransfer.setDragImage(box, this.dragging.dx, this.dragging.dy);
        }

        return;
      },
      dragend: function(evt){
        evt.preventDefault();
        // do just clean up and nothing else when the drag target has overlap with some other tiles
        if(
          !(this.dragging.hasOverlap) &&
          !(this.dragging.x === undefined) && !(this.dragging.y === undefined)
        ){
          //// find the dragged object (tile) in this.tiles
          let tile = null;
          for(let i=0; i<this.tiles.length; i++){
            if( this.tiles[i].tileId === this.dragging.id ){
              tile = this.tiles[i];
              break;
            }
          }
          const left = this.dragging.x - this.dragging.dx;
          const top  = this.dragging.y - this.dragging.dy - parseInt(this.gridHpx);
          this.place(tile, {left: left, top: top});
        }

        // clean up in-dragging only objects
        this.dragging.box.parentNode.removeChild(this.dragging.box);
        delete this.dragging.box;
        this.dragging = {};

        return;
      },
      drop: function(evt){
        evt.preventDefault();

        return;
      },
      dragover: function(evt){
        const ex = evt.pageX;
        const ey = evt.pageY;
        // following left, top, right and bottom is relative to TileArea
        const left = ex - this.geo.abs.left - this.dragging.dx;
        const top  = ey - this.geo.abs.top  - this.dragging.dy;
        const right  = left + this.dragging.rect.width;
        const bottom = top  + this.dragging.rect.height;
        // check whether drag target is in the TileArea
        if(
          left < 0 || this.geo.width  < right ||
          top  < 0 || this.geo.height < bottom
        ){
          return;
        }

        // move the box for colorlzing to the posiotion of drag target
        this.dragging.box.style['left'] = (ex - this.dragging.dx) + 'px';
        this.dragging.box.style['top']  = (ey - this.dragging.dy) + 'px';

        // colorize as undroppable when drag target has overlap with the others
        this.dragging.hasOverlap = this.hasOverlap(this.dragging.tile, left, top, right, bottom);
        
        if(this.dragging.hasOverlap && this.dragging.box){
          this.dragging.box.style['background'] = '#fa8';
        } else {
          // register the mouse position
          this.dragging.x = ex;
          this.dragging.y = ey;
          this.dragging.box.style['background'] = '#fff';
        }

        return;
      },
      setTilePos: function(tile, xsz, ysz){
        if(xsz !== undefined){
          tile.xsz_px = xsz;
        }
        if(ysz !== undefined){
          tile.ysz_px = ysz;
        }
        if(tile != null && tile.tileId !== undefined){
          const o = document.getElementById(tile.tileId);
          if( o != null){
            o.style['width']  = tile.xsz_px + 'px';
            o.style['height'] = tile.ysz_px + 'px';
          }
        }

        try{
          const rect = document.getElementById(tile.tileId).getBoundingClientRect();
          tile.pos.left = rect.left - this.geo.abs.left;
          tile.pos.top  = rect.top  - this.geo.abs.top;
        } catch(e){
          tile.pos.left  = 0 ;
          tile.pos.top   = 0;
        }
        tile.pos.right  = tile.pos.left + xsz;
        tile.pos.bottom = tile.pos.top + ysz;

        return;
      },
      szChanged: function(o){
        return;
        /*
        const tile = this.findTileByAreaId(o.tileAreaId);
        if(tile.headerHeight !== undefined){
          this.setTilePos(tile, o.width, o.height + tile.headerHeight);
        } else {
          this.setTilePos(tile, o.width, o.height);
        }
        return;
        */
      },
      /**
       * @param {Object} o - { tileId: id, left: delta_left, top: delta_top, right: delta_top, bottom: delta_bottom }
       *  the positions parameters are in absolute position.
       * @prop this.tileSzCheck is true iff there's no overlap with the other tiles
       */
      doTileSzCheck: function(o){
        const tile = this.findTileByAreaId(o.tileAreaId);
        if(tile == null){
          console.log("Woops! TileArea does not know " + o.tileAreaId);
          return;
        }
        const left   = o.left   - this.geo.abs.left;
        const top    = o.top    - this.geo.abs.top;
        const right  = o.right  - this.geo.abs.left;
        const bottom = o.bottom - this.geo.abs.top;
        const hasOverlap = this.hasOverlap(tile, left, top, right, bottom);
        
        if(hasOverlap){
          this.tileSzCheck = false;
        } else {
          this.tileSzCheck = true;
        }
        
        return;
      },
      /**
       * resize a tile
       * @param {Object} o - { tileId: id, left: delta_left, top: delta_top, right: delta_top, bottom: delta_bottom }
       *  the positions parameters are in absolute position.
       */
      tileSzChanged: function(o){
        const tile = this.findTileByAreaId(o.tileAreaId);
        if(tile == null){
          console.log("Woops! TileArea does not know " + o.tileAreaId);
          return;
        }
        const left   = o.left   - this.geo.abs.left;
        const top    = o.top    - this.geo.abs.top;
        const right  = o.right  - this.geo.abs.left;
        const bottom = o.bottom - this.geo.abs.top;
        const hasOverlap = this.hasOverlap(tile, left, top, right, bottom);
        if(hasOverlap){
          return;
        }
        const w = right-left;
        const h = bottom-top;
        this.place(tile, {left:left, top: top, width: w, height: h});

        return;
      },
      /**
       * add a new tile
       * @param {String} compName - component name
       * @param {Object} pos - initial position.
       *                       When some part of the tile locates outside the TileArea, the position is auto-fitted.
       * @param {Number} pos.left - initial left relative to TileArea in px
       * @param {Number} pos.top - initial top relative to TileArea in px
       * @param {Number} pos.width - initial width in px
       * @param {Number} pos.height - initial height in px
       */
      addTile: function(compName, pos, show){
        show = (show === undefined) ? true : show;
        // pos must fit inside of the TileArea
        const maxX = parseInt(this.gridWpx) * parseInt(this.gridColNum);
        const maxY = parseInt(this.gridHpx) * parseInt(this.gridRowNum);
        pos = (pos !== undefined) ? pos : {};
        // keep left to fit
        if( pos.left === undefined || pos.left < 0){
          pos.left = 0;
        } else if(maxX <= pos.left){
          pos.left = maxX - parseInt(this.gridWpx);
        }
        // keep width to fit
        if( pos.width === undefined){
          const wmx = maxX - pos.left;
          pos.width = (600 < wmx) ? 600 : wmx;
        } else if( maxX <= (pos.left + pos.width) ){
          pos.width = maxX - pos.left; // notice pos.left <= (maxX - this.gridWpx)
        }

        // keep top to fit
        if( pos.top === undefined || pos.top < 0){
          pos.top = 0;
        } else if( maxY <= pos.top ){
          pos.top = maxY - parseInt(this.gridHpx);
        }
        // keep height to fit
        if( pos.height === undefined ){
          const hmx = maxY - pos.top;
          pos.height = (200 < hmx) ? 200 : hmx;
        } else if( maxY <= (pos.top + pos.height) ){
          pos.top = maxY - pos.height;
        }

        const o = {};
        o.show = show;
        // id defined in TileArea
        o.tileAreaId = ++this.lastTileId;
        // id defined in each Tile
        o.tileId = null;
        // width of the tile in px (including header, footer and body)
        o.xsz_px = pos.width;
        // height of the tile in px (including header, footer and body)
        o.ysz_px = pos.height;
        // position of the tile in px (including header, footer and body)
        o.pos = {'left': pos.left, 'top': pos.top, 'right': (pos.left + o.xsz_px), 'bottom': (pos.top + o.ysz_px)};
        // slot properties
        o.slot = { xsz_px: o.xsz_px, ysz_px: (o.ysz_px - 50) }; // 50 = tile's header.height + footer.height

        // component name
        o.component = compName;

        this.tiles.push(o);

        // wait for tileId to be set
        const intid = setInterval(()=>{
          if(o.tileId){
            this.place(o, pos);
            clearInterval(intid);
          }
        }, 1);

        return o;
      },
      delFirstTile: function(){
        this.tiles.splice(0,1);
      },
      delLastTile: function(){
        this.tiles.pop();
      },
      /**
       * delete a tile
       * @param {Object} o - delete target
       * @param {String} o.tileId - id of the tile
       */
      delTile: function(o){
        if(o === undefined || o.tileId === undefined){
          console.log("Woops! no tileId");
          return;
        }
        for(let i=0; i<this.tiles.length; i++){
          if(o.tileId === this.tiles[i].tileId){
            this.tiles.splice(i,1);
            break;
          }
        }

        return;
      },
      /**
       * invoked by Tile's event of 'tileId', register the tile's properties
       * @param {Object} o - keys are tileId, tileAreaId, headerHeight, footerHeight
       */
      registerTileId: function(o){
        let tgt = null;
        this.tiles.forEach((tile)=>{
          if( tile.tileAreaId === o.tileAreaId ){
            tile.tileId = o.tileId;
            tile.headerHeight = o.headerHeight;
            tile.footerHeight = o.footerHeight;
            tgt = tile;
          }
        });

        // calculate and set the tile's width and height
        let w = (tgt.xsz_px !== undefined) ? tgt.xsz_px : 0;
        let h = 0;
        h += (tgt.headerHeight !== undefined) ? tgt.headerHeight : 0;
        h += (tgt.footerHeight !== undefined) ? tgt.footerHeight : 0;
        h += (tgt.ysz_px !== undefined) ? tgt.ysz_px : 0;
        this.setTilePos(tgt, w, h);

        return;
      }
    },
    mounted: function (){
      const rect = document.getElementById(this.areaId).getBoundingClientRect();
      this.geo.abs.left = rect.x;// + this.marginH;
      this.geo.abs.top  = rect.y;// + this.marginV;
      this.geo.abs.right  = this.geo.abs.left + rect.width;
      this.geo.abs.bottom = this.geo.abs.top + rect.height;
      this.geo.width  = rect.width;
      this.geo.height = rect.height;

      // just for loading the components
      ///  add component
      const g0 = {left:0, top:0, width:0, height:0};
      const l = [];
      TileApps.forEach((app)=>{
        let t = this.addTile(app.name, g0, false);
        l.push(t);
      });
      //// remove the instances
      setTimeout(()=>{
        l.forEach((t)=>{
          let j = this.tiles.indexOf(t);
          if(0 <= j){
            this.tiles.splice(j,1);
          }
        });
      }, 500);
      return;
    },
    created: function(){
      /**
       * for external components to emit addTile
       * @param {String} name - Component name
       * @param {Object} pos  - initial location
       */
      TileAreaEventBus.$on('addTile', (name, pos)=>{
        this.addTile(name, pos);
      });
    }
  }

</script>

<style scoped>
  .tile-area {
    width: var(--tile-area-width);
    height: var(--tile-area-height);
    margin: var(--tile-area-margin-v) var(--tile-area-margin-h);
    background: #eee;
    display: grid;
    grid-template-columns: var(--tile-area-col-num);
    grid-template-rows:    var(--tile-area-row-num);
    grid-auto-rows: var(--tile-area-gridH);
  }

  .tile-area div{
    background: #90b0ef;
  }
  .tile-area div:nth-child(even){
    background: #a0efc0;
  }

</style>