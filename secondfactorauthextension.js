function createSecondFactorExtension (execlib, EntryPointService) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    zeroString = String.fromCharCode(0);

  EntryPointService.prototype.loadSecondFactorAuthModules = function () {
    var scfam = this.secondFactorAuthModules, promises;
    this.secondFactorAuthModules = null;
    if (scfam) {
      promises = [];
      lib.traverseShallow(scfam, this.onSecondFactorAuthModuleDesc.bind(this, promises));
      q.all(promises).then(
        this.readyToAcceptUsersDefer.resolve.bind(this.readyToAcceptUsersDefer, true),
        console.error.bind(console)
      );
    } else {
      this.readyToAcceptUsersDefer.resolve(true);
    }
  };

  EntryPointService.prototype.onSecondFactorAuthModuleDesc = function (promises, moduledesc, methodname) {
    if (!(moduledesc && moduledesc.modulename)) {
      promises.push(q.reject(new lib.Error('SECONDFACTORAUTHENTICATIONDESCRIPTOR_INVALID', 'Second Factor Auth Module descriptor must have a "modulename" property')));
      return;
    }
    promises.push(execlib.loadDependencies('client', [moduledesc.modulename], this.onSecondFactorAuthModule.bind(this, methodname, moduledesc)));
  };

  EntryPointService.prototype.onSecondFactorAuthModule = function (methodname, moduledesc, module) {
    if (!lib.isFunction(module)) {
      return q.reject(new lib.Error('NOT_A_SECONDFACTORAUTHENTICATON_MODULE', moduledesc.modulename));
    }
    try {
      this.secondFactorAuthenticators.add(methodname, new module(moduledesc.propertyhash));
      return q(true);
    } catch(e) {
      return q.reject(e);
    }
  };
  EntryPointService.prototype.onSecondPhaseToken = function (userhash, token) {
    if (token) {
      return this.produceSecondPhaseSession(userhash, token);
    }
    return this.produceSession(userhash);
  };
  EntryPointService.prototype.produceSecondPhaseSession = function (userhash, token){
    var session = lib.uid(),
      tokenobj = {secondphase:true,session:session},
      sw = this.state.get('sessions');
    if (sw) {
      return sw.call('create', {session:session, username: userhash.name+zeroString+token}).then(
        qlib.returner(tokenobj)
      );
    } else {
      return q(tokenobj);
    }
  };
  EntryPointService.prototype.checkForSecondPhaseUserName = function (username) {
    var zsind;
    if (!lib.isString(username)) {
      return username;
    }
    zsind = username.indexOf(zeroString);
    if (zsind >= 0) {
      return {
        username: username.substring(0, zsind),
        token: username.substring(zsind+1)
      };
    }
    return username;
  };
}

module.exports = createSecondFactorExtension;
