function createCloneSessionJobCore (lib, mylib) {
  'use strict';

  var Base = mylib.LetInBase;

  function CloneSessionJobCore (entrypoint, response, url) {
    Base.call(this, entrypoint, response, url);
    this.userhash = null;
  }
  lib.inherit(CloneSessionJobCore, Base);
  CloneSessionJobCore.prototype.destroy = function () {
    this.userhash = null;
    Base.prototype.destroy.call(this);
  };

  CloneSessionJobCore.prototype.onCheckIfSessionIsChecked = function (identityobj) {
    if(!(identityobj && identityobj.session && identityobj.userhash)){
      this.endResponse({});
      return;
    }
    this.userhash = identityobj.userhash;
  };
  CloneSessionJobCore.prototype.produceSession = function () {
    return this.entrypoint.produceAuthSession(this.userhash);
  };
  CloneSessionJobCore.prototype.onProduceSession = function (prodsessresult) {
    if (prodsessresult && prodsessresult.session) {
      this.endResponse({session: prodsessresult.session});
      return;
    }
    this.endResponse({});
  };

  CloneSessionJobCore.prototype.steps = [
    'checkIfSessionIsChecked',
    'onCheckIfSessionIsChecked',
    'produceSession',
    'onProduceSession'
  ];


  mylib.CloneSession = CloneSessionJobCore;
}
module.exports = createCloneSessionJobCore;