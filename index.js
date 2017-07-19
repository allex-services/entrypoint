function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['allex_httpexecutorservice', '.authentication', 'allex_fakehttpresponselib']
    },
    sinkmap: {
      dependencies: ['allex_httpexecutorservice']
    },
    tasks: {
      dependencies: ['allex_userrepresentationlib']
    }
  };
}

module.exports = createServicePack;
