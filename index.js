function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['allex:httpexecutor', '.authentication', 'allex:fakehttpresponse:lib']
    },
    sinkmap: {
      dependencies: ['allex:httpexecutor']
    },
    tasks: {
      dependencies: ['allex:userrepresentation:lib']
    }
  };
}

module.exports = createServicePack;
