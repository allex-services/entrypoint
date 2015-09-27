function createUserServiceSinkObtainer (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function UserServiceSinkObtainerTask (prophash) {
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.propertyhash = prophash.propertyhash;
    this.cb = prophash.cb;
    this.ipaddress = null;
  }
  lib.inherit(UserServiceSinkObtainerTask, Task);
  UserServiceSinkObtainerTask.prototype.destroy = function () {
    this.ipaddress = null;
    this.cb = null;
    this.propertyhash = null;
    this.identity = null;
    this.sinkname = null;
    Task.prototype.destroy.call(this);
  };
  UserServiceSinkObtainerTask.prototype.go = function () {
    this.obtainEntryPointSink();
  };
  UserServiceSinkObtainerTask.prototype.onEntryPointSink = function (sinkinfo) {
    if(!sinkinfo.sink){
      return;
    }
    taskRegistry.run('readState', {
      state: taskRegistry.run('materializeState', {
        sink: sinkinfo.sink
      }),
      name: 'port',
      cb: this.onEntryPointPort.bind(this,sinkinfo)
    });
  };
  UserServiceSinkObtainerTask.prototype.onEntryPointPort = function (sinkinfo, port) {
    sinkinfo.sink.destroy();
    this.goForLetMeIn(sinkinfo.ipaddress, port);
  };
  UserServiceSinkObtainerTask.prototype.goForLetMeIn = function (address, port) {
    if (!this.log) {
      return;
    }
    lib.request('http://'+address+':'+port+'/letMeIn',{
      onComplete: this.onLetMeIn.bind(this),
      onError: this.goForLetMeIn.bind(this, address, port),
      parameters: this.identity
    });
  };
  UserServiceSinkObtainerTask.prototype.onLetMeIn = function (responseobj) {
    if (!(responseobj && responseobj.data)) {
      console.log('bad login', this.identity);
      this.cb({
        task: this,
        taskRegistry: taskRegistry
      });
      this.destroy();
    } else {
      var response, taskobj = {task:null};
        response = JSON.parse(responseobj.data);
        this.ipaddress = response.ipaddress;
      taskobj.task = taskRegistry.run('acquireSink',{
        connectionString: 'ws://'+response.ipaddress+':'+response.port,
        session: response.session,
        onSink: this.onTargetSink.bind(this, taskobj)
      });
    }
  };
  UserServiceSinkObtainerTask.prototype.onTargetSink = function (taskobj, sink) {
    if(!sink) {
      return;
    }
    lib.runNext(taskobj.task.destroy.bind(taskobj.task));
    taskobj.task = null;
    taskobj = null;
    taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this.onUserServiceSink.bind(this),
      propertyhash: this.propertyhash || {}
    });
  };
  UserServiceSinkObtainerTask.prototype.onUserServiceSink = function (sink) {
    if (this.representation) {
      this.representation.setSink(sink, this.sinkinfoextras).done(
        this.finalize.bind(this, sink)
      );
    } else {
      this.finalize(sink);
    }
  };
  UserServiceSinkObtainerTask.prototype.finalize = function (sink) {
    this.cb({
      task: this,
      sink: sink,
      taskRegistry: taskRegistry
    });
  };
  UserServiceSinkObtainerTask.prototype.compulsoryConstructionProperties = ['cb'];

  return UserServiceSinkObtainerTask;
}

module.exports = createUserServiceSinkObtainer;
