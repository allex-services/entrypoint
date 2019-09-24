function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['allex_httpexecutorservice', '.authentication', 'allex_fakehttpresponselib', 'allex_remoteauthenticationmixinslib', 'allex_sessionsauthenticationmixinslib']
    },
    sinkmap: {
      dependencies: ['allex_httpexecutorservice']
    },
    tasks: {
      dependencies: ['allex_userrepresentationlib', 'allex:readsinkstate:lib']
    }
  };
}

module.exports = createServicePack;
