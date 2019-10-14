function createUserServiceViaEntryPointSinkObtainer (execlib, UserServiceSinkObtainerTask, waitForStateField) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function UserServiceViaEntryPointSinkObtainerTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.propertyhash = prophash.propertyhash;
    this.cb = prophash.cb;
    this.ipaddress = null;
    this.targetSink = null;
    this.acquireUserServiceSinkTask = null;
    this.task = null;
  }
  lib.inherit(UserServiceViaEntryPointSinkObtainerTask, UserServiceSinkObtainerTask);
  UserServiceViaEntryPointSinkObtainerTask.prototype.destroy = function () {
    if (this.task) {
      this.task.destroy();
    }
    this.task = null;
    if (this.acquireUserServiceSinkTask) {
      this.acquireUserServiceSinkTask.destroy();
    }
    this.acquireUserServiceSinkTask = null;
    this.targetSink = null;
    this.ipaddress = null;
    this.cb = null;
    this.propertyhash = null;
    this.identity = null;
    this.sinkname = null;
    UserServiceSinkObtainerTask.prototype.destroy.call(this);
  };
  UserServiceViaEntryPointSinkObtainerTask.prototype.obtainEntryPointAddressAndPort = function () {
    this.obtainEntryPointSink();
  };
  UserServiceViaEntryPointSinkObtainerTask.prototype.onEntryPointSink = function (sinkinfo) {
    if(!(sinkinfo && sinkinfo.sink)){
      return;
    }
    waitForStateField(sinkinfo.sink, 'port').then(this.onEntryPointPort.bind(this, sinkinfo));
  };
  UserServiceViaEntryPointSinkObtainerTask.prototype.onEntryPointPort = function (sinkinfo, port) {
    sinkinfo.sink.destroy();
    this.goForLetMeIn(sinkinfo.ipaddress, port);
  };
  UserServiceViaEntryPointSinkObtainerTask.prototype.compulsoryConstructionProperties = ['cb'];

  return UserServiceViaEntryPointSinkObtainerTask;
}
module.exports = createUserServiceViaEntryPointSinkObtainer;
