function createJobCores (execlib) {
  'use strict';

  var mylib = {};

  require('./basecreator')(execlib.lib, mylib);
  require('./targethuntercreator')(execlib, mylib);

  require('./onresponse')(execlib, mylib);

  return mylib;
}
module.exports = createJobCores;