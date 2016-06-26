function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['allex:httpexecutor']
    },
    sinkmap: {
      dependencies: ['allex:httpexecutor']
    },
    tasks: {
      dependencies: []
    }
  };
}

module.exports = createServicePack;
