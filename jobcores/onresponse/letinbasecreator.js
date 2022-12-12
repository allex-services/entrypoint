function createLetInBaseJobCore (lib, mylib) {
  'use strict';

  var Base = mylib.BaseOnResponse;

  function LetInBaseJobCore (entrypoint, response, urlobj) {
    Base.call(this, entrypoint, response);
    this.url = urlobj;
    this.ipaddress = null;
    this.port = null;
    this.sink = null;
  }
  lib.inherit(LetInBaseJobCore, Base);
  LetInBaseJobCore.prototype.destroy = function () {
    this.sink = null;
    this.port = null;
    this.ipaddress = null;
    this.url = null;
    Base.prototype.destroy.call(this);
  };
  LetInBaseJobCore.prototype.shouldContinue = function () {
    var ret = Base.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!(this.url && this.url.auth)) {
      this.endResponse({});
      return new lib.Error('NO_URL_AUTH', 'There was no auth on provided url object for '+this.constructor.name);
    }
  };

  LetInBaseJobCore.prototype.chooseTarget = function () {
    //now, introduceSession to a __chosen__ target. __chosen__
    return this.entrypoint.chooseTarget();
  };
  LetInBaseJobCore.prototype.onChooseTarget = function (targetobj) {
    if(!(targetobj && targetobj.target && targetobj.target.sink)){
      console.log('onTargetChosen, but no target', targetobj);
      this.endResponse({error:'NO_TARGETS_YET'});
      return;
    }
    this.ipaddress = targetobj.target.publicaddress || targetobj.target.address;
    this.port = targetobj.target.publicport || targetobj.target.port;
    this.sink = targetobj.target.sink;
  };
  LetInBaseJobCore.prototype.introduceSession = function () {
    return this.sink.call(
      'introduceSession',
      this.identityobj.session,
      this.identityobj.userhash
    );
  };
  

  LetInBaseJobCore.prototype.checkIfSessionIsChecked = function () {
    var session, token, record;
    var spc;
    session = this.url.auth.session;
    token = this.url.alreadyprocessed ? this.url.alreadyprocessed.secondphasetoken : null;
    record = this.url.auth;
    if (!session) {
      this.endResponse({});
      return null;
    }
    if (record) {
      //now get the User DB record from remote authentication and resolve the defer with that record data
      spc = this.entrypoint.checkForSecondPhaseUserName(record.username);
      if (spc && 'object' === typeof spc && 'username' in spc && 'token' in spc) {
        if (token != spc.token) {
          //console.error('token', token, '!== db token', spc.token);
          this.endResponseWithError(new lib.Error('SECONDPHASE_TOKEN_MISMATCH'));
          return null;
        }
        record.username = spc.username;
        return this.entrypoint.deleteAuthSession(session, record).then(
          this.fetchUserFromSessionRecord.bind(this, session)
        );
      }
      return this.fetchUserFromSessionRecord(session, record);
    }
    this.endResponseWithError(new lib.Error('SESSION_DOES_NOT_EXIST', session));
    return null;
  };
  LetInBaseJobCore.prototype.fetchUserFromSessionRecord = function (session, record) {
    var ret = this.entrypoint.fetchRemoteUser(record)
      .then(onFetchUserFromSessionRecord.bind(null, session));
    session = null;
    return ret;
  };

  function onFetchUserFromSessionRecord (session, userhash) {
    return {userhash:userhash,session:session};
  }

  mylib.LetInBase = LetInBaseJobCore;
}
module.exports = createLetInBaseJobCore;