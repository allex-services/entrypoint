function createServicePack(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    d = q.defer(),
    execSuite = execlib.execSuite;

  execSuite.registry.register('allex_httpservice').done(
    realCreator.bind(null, d),
    d.reject.bind(d)
  );

  function realCreator(defer, ParentServicePack) {
    defer.resolve({
      Service: require('./servicecreator')(execlib, ParentServicePack),
      SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack)
    });
  }

  return d.promise;
}

module.exports = createServicePack;
