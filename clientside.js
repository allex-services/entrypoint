function createClientSide(execlib,ParentServicePack) {
  'use strict';
  execlib.execSuite.UserRepresentation = require('./userrepresentationcreator')(execlib);
  var UserServiceSinkObtainerTask = require('./tasks/userservicesinkobtainercreator')(execlib),
    GetInTask = require('./tasks/getIn')(execlib, UserServiceSinkObtainerTask);
  return {
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack),
    Tasks: [{
      name: 'letMeIn',
      klass: require('./tasks/letMeIn')(execlib, UserServiceSinkObtainerTask)
    },{
      name: 'getIn',
      klass: GetInTask
    },{
      name: 'getInWithRepresentation',
      klass: require('./tasks/getInWithRepresentation')(execlib, GetInTask)
    }]
  };
}

module.exports = createClientSide;
