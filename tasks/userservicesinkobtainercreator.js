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
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.cb = prophash.cb;
    this.sinkinfoextras = prophash.sinkinfoextras;
    this.ipaddress = null;
  }
  lib.inherit(UserServiceSinkObtainerTask, Task);
  UserServiceSinkObtainerTask.prototype.destroy = function () {
    this.ipaddress = null;
    this.sinkinfoextras = null;
    this.cb = null;
    this.representation.destroy();
    this.representation = null;
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
    try {
      lib.request('http://'+sinkinfo.ipaddress+':'+port+'/letMeIn',{
        onComplete: this.onLetMeIn.bind(this),
        parameters: this.identity
      });
    }
    catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  UserServiceSinkObtainerTask.prototype.onLetMeIn = function (responseobj) {
    if (!(responseobj && responseobj.data)) {
      this.cb(null);
    } else {
      var response, taskobj = {task:null};
      try {
        response = JSON.parse(responseobj.data);
        this.ipaddress = response.ipaddress;
        taskobj.task = taskRegistry.run('acquireSink',{
          connectionString: 'ws://'+response.ipaddress+':'+response.port,
          session: response.session,
          onSink: this.onTargetSink.bind(this, taskobj)
        });
      } catch (e) {
        console.error(responseobj,'=>',e.stack);
        console.error(e);
        this.cb(null);
      }
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
      cb: this.onUserServiceSink.bind(this)
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
