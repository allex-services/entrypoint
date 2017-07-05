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
      onComplete: this.onLetMeIn.bind(this, address, port),
      onError: this.onGoForLetMeInFailed.bind(this, address, port),
      parameters: this.identity
    });
  };
  UserServiceSinkObtainerTask.prototype.onGoForLetMeInFailed = function (address, port) {
    lib.runNext(this.goForLetMeIn.bind(this, address, port), lib.intervals.Second);
  };
  UserServiceSinkObtainerTask.prototype.onLetMeIn = function (address, port, responseobj) {
    console.log('onLetMeIn', arguments);
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
      if (response.error && response.error === 'NO_TARGETS_YET') {
        this.onGoForLetMeInFailed(address, port);
        return;
      }
      if (!( response.ipaddress && response.port )) {
        console.log('bad login', this.identity);
        this.cb({
          task: this,
          taskRegistry: taskRegistry
        });
        this.destroy();
        return;
      }
      console.log('will acquireSink on Users', response.ipaddress, ':', response.port);
      taskobj.task = taskRegistry.run('acquireSink',{
        connectionString: 'ws://'+response.ipaddress+':'+response.port,
        session: response.session,
        singleshot: true,
        onSink: this.onTargetSink.bind(this, taskobj, response.session)
      });
    }
  };
  UserServiceSinkObtainerTask.prototype.onTargetSink = function (taskobj, session, sink) {
    if(!sink) {
      return;
    }
    lib.runNext(taskobj.task.destroy.bind(taskobj.task));
    taskobj.task = null;
    taskobj = null;
    taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this.onUserServiceSink.bind(this, session),
      propertyhash: this.propertyhash || {}
    });
  };
  UserServiceSinkObtainerTask.prototype.onUserServiceSink = function (session, sink) {
    if (this.representation) {
      this.representation.setSink(sink, this.sinkinfoextras).done(
        this.finalize.bind(this, session, sink)
      );
    } else {
      this.finalize(session, sink);
    }
  };
  UserServiceSinkObtainerTask.prototype.finalize = function (session, sink) {
    if (this.cb) {
      this.cb({
        task: this,
        session: session,
        sink: sink,
        taskRegistry: taskRegistry,
        execlib: execlib
      });
    }
  };
  UserServiceSinkObtainerTask.prototype.goForLetMeOut = function (address, port) {
    if (!this.log) {
      return;
    }
    console.log('requesting letMeOut on', address, port);
    lib.request('http://'+address+':'+port+'/letMeOut',{
      /*
      onComplete: this.onLetMeOut.bind(this),
      onError: this.goForLetMeOut.bind(this, address, port),
      */
      onComplete: this.onLetMeOut.bind(this, address, port),
      onError: this.onLetMeOutError.bind(this, address, port),
      parameters: this.identity
    });
  };
  UserServiceSinkObtainerTask.prototype.onLetMeOut = function (address, port) {
    console.log('letMeOut succeeded on', address, port);
    this.destroy();
  };
  UserServiceSinkObtainerTask.prototype.onLetMeOutError = function (address, port, error) {
    console.log('letMeOut failed on', address, port, error);
    //TODO; check for non-existing user for logout.
    //it makes no sense to retry
    lib.runNext(this.goForLetMeOut.bind(this, address, port), lib.intervals.Second);
  };
  UserServiceSinkObtainerTask.prototype.compulsoryConstructionProperties = ['cb'];

  return UserServiceSinkObtainerTask;
}

module.exports = createUserServiceSinkObtainer;
