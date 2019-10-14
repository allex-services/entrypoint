function createLetMeInOnAddressAndPortTask (execlib, UserServiceSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib;

  function LetMeInOnAddressAndPortTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.ipaddress = prophash.ipaddress;
    this.port = prophash.port;
    this.cb = prophash.cb;
  }
  lib.inherit(LetMeInOnAddressAndPortTask, UserServiceSinkObtainerTask);
  LetMeInOnAddressAndPortTask.prototype.obtainEntryPointAddressAndPort = function () {
    this.goForLetMeIn(this.ipaddress, this.port);
  };
  LetMeInOnAddressAndPortTask.prototype.compulsoryConstructionProperties = ['ipaddress', 'port', 'cb'];

  return LetMeInOnAddressAndPortTask;
}
module.exports = createLetMeInOnAddressAndPortTask;
