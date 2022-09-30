function createLetMeInJobCore (lib, mylib) {
  'use strict';

  var Base = mylib.LetInBase;

  function LetMeInJobCore (entrypoint, response, url) {
    Base.call(this, entrypoint, response, url);
    this.identityobj = null;
    this.session = null;
    this.finalAnswer = null;
  }
  lib.inherit(LetMeInJobCore, Base);
  LetMeInJobCore.prototype.destroy = function () {
    this.finalAnswer = null;
    this.session = null;
    this.identityobj = null;
    Base.prototype.destroy.call(this);
  };

  LetMeInJobCore.prototype.processResolvedUser = function () {
    return this.entrypoint.processResolvedUser(this.url.auth);
  };
  LetMeInJobCore.prototype.onProcessResolvedUser = function (identityobj) {    
    if(!(identityobj && identityobj.session)){
      this.endResponse({});
      return;
    }
    if (identityobj.secondphase === true) {
      this.endResponse({
        secondphase: identityobj.session
      });
      return;
    }
    this.identityobj = identityobj;
    this.session = this.identityobj.session;
  };
  LetMeInJobCore.prototype.onIntroduceSession = function (sessintrdctresponse) {
    if (
      sessintrdctresponse && 
      lib.isFunction(sessintrdctresponse.hasOwnProperty) && 
      sessintrdctresponse.hasOwnProperty('ipaddress') &&
      sessintrdctresponse.hasOwnProperty('port')
    ){
      return {
        ipaddress: sessintrdctresponse.ipaddress,
        port: sessintrdctresponse.port,
        session: this.session
      };
    }
    if (sessintrdctresponse === this.session) {
      return {
        ipaddress: this.ipaddress,
        port: this.port,
        session: this.session
      };
    }
    return {error:'NO_TARGETS_YET'};
  };
  LetMeInJobCore.prototype.setFinalAnswer = function (finalanswer) {
    this.finalAnswer = finalanswer;
  }
  LetMeInJobCore.prototype.finalize = function () {
    this.endResponse(this.finalAnswer);
  };

  LetMeInJobCore.prototype.steps = [
    'processResolvedUser',
    'onProcessResolvedUser',
    'chooseTarget',
    'onChooseTarget',
    'introduceSession',
    'onIntroduceSession',
    'setFinalAnswer',
    'finalize'
  ];

  mylib.LetMeIn = LetMeInJobCore;
}
module.exports = createLetMeInJobCore;