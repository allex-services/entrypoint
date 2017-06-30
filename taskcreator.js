function createClientSide(execlib, UserRepresentation) {
  'use strict';
  execlib.execSuite.UserRepresentation = UserRepresentation;
  var UserServiceSinkObtainerTask = require('./tasks/userservicesinkobtainercreator')(execlib),
    GetInTask = require('./tasks/getIn')(execlib, UserServiceSinkObtainerTask),
    GetOutTask = require('./tasks/getOut')(execlib, UserServiceSinkObtainerTask),
    LetMeInTask = require('./tasks/letMeIn')(execlib, UserServiceSinkObtainerTask);
  return [{
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
  },{
    name: 'letMeOut',
    klass: GetOutTask
  }];
}

module.exports = createClientSide;
