function createGetOutTask (execlib, UserServiceSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function GetOutTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.ep_ipaddress = prophash.ipaddress;
    this.ep_port = prophash.port;
  }
  lib.inherit(GetOutTask, UserServiceSinkObtainerTask);
  GetOutTask.prototype.destroy = function () {
    this.ep_port = null;
    this.ep_ipaddress = null;
    UserServiceSinkObtainerTask.prototype.destroy.call(this);
  };
  GetOutTask.prototype.obtainEntryPointSink = function () {
    this.goForLetMeOut(this.ep_ipaddress, this.ep_port);
  };
  GetOutTask.prototype.compulsoryConstructionProperties = ['ipaddress', 'port', 'cb'];

  return GetOutTask;
}

module.exports = createGetOutTask;
