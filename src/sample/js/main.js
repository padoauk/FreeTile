/*
 * entry point of webpack
 */

import app00 from "./app00.js";

window.onload = function(){
  const body = document.getElementsByTagName("body").item(0);
  let num_div = 0;
  let div = null;

  div = document.createElement('div');
  div.id = 'app' + num_div++;
  body.appendChild(div);
  app00(div.id);

};
