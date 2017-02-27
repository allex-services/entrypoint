function createUser(execlib, ParentUser, AllexResponse) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib;

  if(!ParentUser) {
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function User(prophash) {
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User, require('../methoddescriptors/user'), ['port']/*or a ctor for StateStream filter*/);
  User.prototype.__cleanUp = function() {
    ParentUser.prototype.__cleanUp.call(this);
  };

  User.prototype.announceUser = function (userhash, doregister, defer) {
    var checkres = new AllexResponse(), p = checkres.defer.promise;
    this.__service.onUserNameForCheck(checkres, userhash);
    qlib.promise2decision(p, this.existenceChecker.bind(this, userhash, doregister, defer));
  };

  User.prototype.existenceChecker = function (userhash, doregister, defer, checkres) {
    var res;
    if (!checkres) {
      defer.reject(new lib.Error('ERROR_IN_CHECKING_USERNAME', userhash.username));
      defer = null;
      return;
    }
    console.log('checkres:', checkres);
    if (!checkres.exists) {
      if (!doregister) {
        defer.reject(new lib.Error('USERNAME_NOT_FOUND', checkres.username));
        defer = null;
        return;
      }
      res = new AllexResponse(defer);
      userhash.password = lib.uid();
      this.__service.onRegisterParams(res, userhash);
    } else {
      if(!(this.__service && this.__service.remoteDBSink)){
        defer.reject(new lib.Error('NO_DB_YET', checkres.username));
        defer = null;
        return;
      }
      userhash.password = lib.uid();
      this.__service.remoteDBSink.call('forcePassword', checkres.username, userhash.password).then(
        this.onAnnouncedUserPasswordChanged.bind(this, userhash, defer),
        defer.reject.bind(defer)
      );
    }
    defer = null;
  };

  User.prototype.onAnnouncedUserPasswordChanged = function (userhash, defer) {
    var res = new AllexResponse(defer);
    this.__service.letUserHashIn(res, userhash);
  };

  return User;
}

module.exports = createUser;
