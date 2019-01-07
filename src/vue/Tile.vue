<!--
 Copyright (C) 2019, Toshinao Ishii <padoauk@gmail.com>
-->

<!-- Tile.vue -->

<template>
  <div v-show="showTile" v-bind:id="tileId" v-bind:draggable="canDrag" v-on:dragstart="dragstart" v-on:dragend="dragend" v-on:drop="drop">

    <!-- header -->
    <div v-bind:id="tileHeaderId" class="tile-head-container">
      <div class="tile-header" >{{ headerTitle }}</div>
      <div class="tile-delete">
        <img v-on:click="delTile" v-on:mouseup="enableDrag" v-on:mouseout="enableDrag" src="img/closeTile.png" alt="X"/>
      </div>
    </div>

    <!-- slot -->
    <div v-bind:style="slotStyles">
      <div v-on:mousedown="disableDrag" v-on:mouseup="enableDrag" v-on:mouseout="enableDrag">
        <slot v-on:szChanged="szChanged"></slot>
      </div>
    </div>

    <!-- footer -->
    <div v-bind:id="tileFooterId" class="tile-foot-container">
      <div class="footer-fill"></div>
      <div class="handle-container" v-on:mousedown="disableDrag">
        <div class="resize-handle resize-nesw" v-on:mousedown="resizeStart"></div>
        <div class="resize-handle resize-ns" v-on:mousedown="resizeStart"></div>
        <div class="resize-handle resize-nwse" v-on:mousedown="resizeStart"></div>
      </div>
    </div>

  </div>
</template>

<script>
  import { Idxx } from '../js/util';
  
  export default {
    name: "Tile",

    props: {
      tileAreaId: {
        type: Number,
      },
      title: {
        type: String,
        default: ""
      },
      width: {
        type: Number
      },
      height: {
        type: Number
      },
      gridWpx: {
        type: Number
      },
      gridHpx: {
        type: Number
      },
      tileSzCheck: {
        type: Boolean
      },
      showTile: {
        type: Boolean,
        default: true
      }
    },

    data() {
      return {
        tileId: 'tile' + Idxx(),
        tileHeaderId: 'head' + Idxx(),
        tileFooterId: 'foot' + Idxx(),
        slotId: 'slot' + Idxx(),
        myAreaId: undefined,
        canDrag: true,
        resize: {}
      }
    },
    computed: {
      headerTitle: function(){
        if(this.myAreaId === undefined){
          this.myAreaId = this.tileAreaId;
        }
        if( this.title.length == 0 ){
          return "header " + this.myAreaId;
        }
        return this.title;
      },
      slotStyles: function(){
        // 50 is .tile-header.height + .title-footer.height
        let h = this.height - 50;
        h = (0 <= h) ? h : 0;
        return `height: ${h}px;`;
      }
    },
    methods: {
      dragstart: function(evt){
        evt.stopPropagation();
        if(! this.canDrag) {
          return;
        }
        this.$emit('dragstart',evt);
        return;
      },
      dragend: function(evt){
        evt.stopPropagation();
        this.$emit('dragend',evt);
        return;
      },
      drop: function(evt){
        evt.stopPropagation();
        return;
      },
      enableDrag: function(){
        this.canDrag = true;
        this.$emit('enableDrag');
        return;
      },
      disableDrag: function(){
        this.canDrag = false;
        this.$emit('disableDrag');
        return;
      },
      szChanged: function(sz){
        return;
      },
      delTile: function(){
        this.$emit('delTile', {tileId: this.tileId, tileAreaId: this.tileAreaId});
        return;
      },
      /**
       * initialize the resize box and resize.pos() and then prepare and hook doDrag() and finishDrag()
       * @param {Object} evt - event
       */
      resizeStart: function(evt){
        // set resize.pos() which returns the grid position associated with the mouse position
        const tile = document.getElementById(this.tileId);
        const rect0 = tile.getBoundingClientRect();
        if( evt.target.classList.contains('resize-ns') ){
          this.resize.pos = (x,y)=>{
            const dy = y - rect0.bottom;
            const gy = parseInt(dy / this.gridHpx) * this.gridHpx;
            return {
              left:   rect0.left  + window.scrollX,
              right:  rect0.right + window.scrollX,
              top:    rect0.top   + window.scrollY,
              bottom: gy + rect0.bottom
            };
          }
        } else if(evt.target.classList.contains('resize-nesw')){
          this.resize.pos = (x,y)=>{
            const dy = y - rect0.bottom;
            const gy = parseInt(dy / this.gridHpx) * this.gridHpx;
            const dx = x - rect0.left;
            const gx = parseInt(dx / this.gridWpx) * this.gridWpx
            return {
              left:   gx + rect0.left,
              right:  rect0.right + window.scrollX,
              top:    rect0.top   + window.scrollY,
              bottom: gy  + rect0.bottom
            };
          }
        } else if(evt.target.classList.contains('resize-nwse')) {
          this.resize.pos = (x,y)=>{
            const dy = y - rect0.bottom;
            const gy = parseInt(dy / this.gridHpx) * this.gridHpx;
            const dx = x - rect0.right;
            const gx = parseInt(dx / this.gridWpx) * this.gridWpx
            return {
              left:   rect0.left + window.scrollX,
              right:  gx + rect0.right,
              top:    rect0.top  + window.scrollY,
              bottom: gy + rect0.bottom
            };
          }
        } else {
          this.resize.pos = (x,y)=>{
            return {
              left:   rect0.left   + window.scrollX,
              right:  rect0.right  + window.scrollX,
              top:    rect0.top    + window.scrollY,
              bottom: rect0.bottom + window.scrollY
            };
          }
        }

        // create the resize box
        let resizer = document.createElement('div');
        resizer.left0 = rect0.left   + window.scrollX;
        resizer.right0 = rect0.right + window.scrollX;

        this.resize.resizer = resizer;
        resizer.style['position'] = 'absolute';
        resizer.style['width'] = rect0.width + 'px';
        resizer.style['height'] =  rect0.height + 'px';
        resizer.style['padding'] = '0px';
        resizer.style['margin'] = '0px';
        resizer.style['left'] =  rect0.left + 'px'; // box is in absolute position
        resizer.style['top'] = rect0.top + 'px';
        resizer.style['background'] =  '#fff';
        resizer.style['opacity'] =  0.2;
        resizer.style['border'] = '2px solid black';

        // prepare doDrag()
        /**
         * resize the resize box and set the background depending on placeable or not
         */
        const doDrag = (e) => {
          try{
            const r = this.resize.pos(e.pageX, e.pageY);

            this.$emit(
              'doTileSzCheck',
              { tileId: this.tileId, tileAreaId: this.tileAreaId,
                left:   r.left,
                top:    r.top,
                right:  r.right,
                bottom: r.bottom
              }
            );

            resizer.style['left'] = r.left + 'px';
            resizer.style['top']  = r.top  + 'px';
            resizer.style['width']  = (r.right - r.left) + 'px';
            resizer.style['height'] = (r.bottom - r.top) + 'px';
            if(this.tileSzCheck) {
              resizer.style['background'] = '#fff' ;
            } else {
              resizer.style['background'] = '#fa8' ;
            }
          } catch (e) {
            ;
          }
          return;
        };
        // prepare finishDrag()
        /**
         * disconnect doDrag() and finishDrag() and emit tileSzChanged()
         * @param {Object} e - event
         */
        const finishDrag = (e) => {
          try{
            document.removeEventListener('mousemove', doDrag, false);
            document.removeEventListener('mouseup', finishDrag, false);

            const r = this.resize.pos(e.pageX, e.pageY);
            this.$emit(
              'tileSzChanged',
              { tileId: this.tileId, tileAreaId: this.tileAreaId,
                left:   r.left,
                top:    r.top,
                right:  r.right,
                bottom: r.bottom
              }
            );
            tile.removeChild(resizer);
            delete this.resizer.resizer;
          } catch(e){
            ;
          } finally {
            this.resize = {};
          }
          return;
        };
        // hook up doDrag() and finishDrag()
        document.addEventListener('mousemove', doDrag, false);
        document.addEventListener('mouseup', finishDrag, false);

        tile.appendChild(resizer);

        return;
      }
    },
    mounted: function(){
      const h = document.getElementById(this.tileHeaderId);
      const hRect = h.getBoundingClientRect();
      const f = document.getElementById(this.tileFooterId);
      const fRect = f.getBoundingClientRect();
      this.$emit(
        'tileId',
        {
          tileId: this.tileId, tileAreaId: this.tileAreaId,
          headerHeight: hRect.height,
          footerHeight: fRect.height,
        }
      );

      return;
    }
  }
</script>

<style scoped>
  .tile-head-container{
    display: table;
    width: 100%;
  }
  .tile-header{
    display: table-cell;
    vertical-align: middle;
    background: gold;
    cursor: move;
    width: 100%;
    height: 25px;
    padding: 0px;
    margin: 0px;
  }
  .tile-delete {
    display: table-cell;
    vertical-align: middle;
    background: gold;
  }
  .tile-delete > img {
    width: 16px;
    height: 16px;
    vertical-align: middle;
  }
  .tile-foot-container{
    background: gold;
    cursor: move;
    width: 100%;
    height: 25px;
    padding: 0px;
    margin: 0px;
  }
  .footer-fill{
    width:100%;
    height:15px;
    cursor: move;
  }
  .handle-container{
    display: flex;
  }
  .resize-handle{
    height: 10px;
  }
  .resize-nesw{
    width: 10px;
    cursor: nesw-resize;
  }
  .resize-ns{
    flex: 1;
    cursor: ns-resize;
  }
  .resize-nwse{
    width: 10px;
    cursor: nwse-resize;
  }
</style>