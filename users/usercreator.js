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

  User.prototype.announceUser = function (userhash, doregister, keeppassword, defer) {
    if (keeppassword) {
      this.announceUserWithNoPasswordChange(userhash, doregister, defer);
    } else {
      this.announceUserWithPasswordChange(userhash, doregister, defer);
    }
  };

  User.prototype.announceUserWithPasswordChange = function (userhash, doregister, defer) {
    var checkres = new AllexResponse(), p = checkres.defer.promise;
    this.__service.onUserNameForCheck(checkres, userhash);
    p.then(this.existenceChecker.bind(this, userhash, doregister, defer));
  };

  User.prototype.existenceChecker = function (userhash, doregister, defer, checkres) {
    if (!checkres) {
      defer.reject(new lib.Error('ERROR_IN_CHECKING_USERNAME', userhash.username));
      defer = null;
      return;
    }
    if (!checkres.exists) {
      this.onNoUserToAnnounce(userhash, checkres.username, doregister, defer);
    } else {
      if (!this.__service) {
        defer.reject(new lib.Error('ALREADY_DESTROYED', 'This service instance is already dead'));
        defer = null;
        return;
      }
      userhash.password = lib.uid();
      this.__service.forceRemotePassword(checkres.username, userhash.password).then(
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
  
  User.prototype.announceUserWithNoPasswordChange = function (userhash, doregister, defer) {
    this.__service.fetchRemoteUser(userhash.username).then(
      this.onAnnouncedUserFetched.bind(this, userhash, doregister, defer),
      defer.reject.bind(defer)
    );
  };

  User.prototype.onAnnouncedUserFetched = function (userhash, doregister, defer, fetchresult) {
    var res;
    if (!fetchresult) {
      this.onNoUserToAnnounce(userhash, userhash.username, doregister, defer);
    } else {
      res = new AllexResponse(defer);
      lib.extend(fetchresult.profile, userhash);
      this.__service.processResolvedUser(fetchresult).then(
        this.__service.doLetHimIn.bind(this.__service, res)
      );
    }
  };

  User.prototype.onNoUserToAnnounce = function (userhash, username, doregister, defer) {
    var res;
    if (!doregister) {
      defer.reject(new lib.Error('USERNAME_NOT_FOUND', username));
      defer = null;
      return;
    }
    res = new AllexResponse(defer);
    userhash.password = lib.uid();
    this.__service.onRegisterParams(res, userhash);
  };

  return User;
}

module.exports = createUser;
