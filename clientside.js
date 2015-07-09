function createClientSide(execlib,ParentServicePack) {
  'use strict';
  return {
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack),
    Tasks: [{
      name: 'letMeIn',
      klass: require('./tasks/letMeIn')(execlib)
    }]
  };
}

module.exports = createClientSide;
