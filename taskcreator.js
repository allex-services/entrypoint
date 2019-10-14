function createClientSide(execlib, UserRepresentation, readSinkState) {
  'use strict';
  execlib.execSuite.UserRepresentation = UserRepresentation;
  var UserServiceSinkObtainerTask = require('./tasks/userservicesinkobtainercreator')(execlib),
    UserServiceViaEntryPointSinkObtainerTask = require('./tasks/userserviceviaentrypointsinkobtainercreator')(execlib, UserServiceSinkObtainerTask, readSinkState),
    LetMeInOnAddressAndPortTask = require('./tasks/letMeInOnAddressAndPort')(execlib, UserServiceSinkObtainerTask),
    GetInTask = require('./tasks/getIn')(execlib, UserServiceViaEntryPointSinkObtainerTask),
    GetOutTask = require('./tasks/getOut')(execlib, UserServiceViaEntryPointSinkObtainerTask),
    LetMeInTask = require('./tasks/letMeIn')(execlib, UserServiceViaEntryPointSinkObtainerTask);
  return [{
    name: 'letMeIn',
    klass: LetMeInTask
  },{
    name: 'letMeInOnAddressAndPort',
    klass: LetMeInOnAddressAndPortTask
  },{
    name: 'findMeIn',
    klass: require('./tasks/findMeIn')(execlib, LetMeInTask)
  },{
    name: 'getIn',
    klass: GetInTask
  },{
    name: 'getInWithRepresentation',
    klass: require('./tasks/getInWithRepresentation')(execlib, GetInTask)
  },{
    name: 'letMeOut',
    klass: GetOutTask
  }];
}

module.exports = createClientSide;
