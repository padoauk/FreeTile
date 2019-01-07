import Vue from 'vue'
import App00 from '../vue/DashBoard.vue'

export default function(divId) {
  new Vue({
    el: '#'+divId,
    render: h => h(App00)
  });
};
