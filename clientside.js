function createClientSide(execlib,ParentServicePack) {
  'use strict';
  execlib.execSuite.UserRepresentation = require('./userrepresentationcreator')(execlib);
  var UserServiceSinkObtainerTask = require('./tasks/userservicesinkobtainercreator')(execlib),
    GetInTask = require('./tasks/getIn')(execlib, UserServiceSinkObtainerTask),
    LetMeInTask = require('./tasks/letMeIn')(execlib, UserServiceSinkObtainerTask);
  return {
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack),
    Tasks: [{
      name: 'letMeIn',
      klass: LetMeInTask
    },{
      name: 'findMeIn',
      klass: require('./tasks/findMeIn')(execlib, LetMeInTask)
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
