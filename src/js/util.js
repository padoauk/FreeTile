/*
 * Copyright (C) 2018, Toshinao Ishii <padoauk@gmail.com>
 */

/*
 * utilities
 */

/**
 * @return {String} (almost) unique string of number
 */
function Idxx(){
  return parseInt(new Date().getTime() + '7' + parseInt(Math.random() * 10000)).toString(36);
}

export { Idxx };

