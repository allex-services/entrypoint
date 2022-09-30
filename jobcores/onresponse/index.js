function createOnResponseJobCores (execlib, mylib) {
  'use strict';

  require('./baseresponsecreator')(execlib.lib, mylib);
  require('./letinbasecreator')(execlib.lib, mylib);
  require('./letmeincreator')(execlib.lib, mylib);
  require('./clonesessioncreator')(execlib.lib, mylib);
}
module.exports = createOnResponseJobCores;