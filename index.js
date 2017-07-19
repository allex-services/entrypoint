function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['allex:httpexecutor', '.authentication', 'allex_fakehttpresponselib']
    },
    sinkmap: {
      dependencies: ['allex:httpexecutor']
    },
    tasks: {
      dependencies: ['allex_userrepresentationlib']
    }
  };
}

module.exports = createServicePack;
