function createServicePack(execlib){
  'use strict';
  var execSuite = execlib.execSuite,
  HttpServicePack = execSuite.registry.register('allex_httpservice'),
  ParentServicePack = HttpServicePack;

  return {
    Service: require('./servicecreator')(execlib, ParentServicePack),
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack)
  };
}

module.exports = createServicePack;
