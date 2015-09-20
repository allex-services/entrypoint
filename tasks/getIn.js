function createGetInTask (execlib, UserServiceSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function GetInTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.ep_ipaddress = prophash.ipaddress;
    this.ep_port = prophash.port;
  }
  lib.inherit(GetInTask, UserServiceSinkObtainerTask);
  GetInTask.prototype.destroy = function () {
    this.ep_port = null;
    this.ep_ipaddress = null;
    UserServiceSinkObtainerTask.prototype.destroy.call(this);
  };
  GetInTask.prototype.obtainEntryPointSink = function () {
    this.goForLetMeIn(this.ep_ipaddress, this.ep_port);
  };
  GetInTask.prototype.compulsoryConstructionProperties = ['ipaddress', 'port', 'cb'];

  return GetInTask;
}

module.exports = createGetInTask;
