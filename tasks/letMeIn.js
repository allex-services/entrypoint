function createLetMeInTask (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function LetMeInTask (prophash) {
    console.log('LetMeInTask', prophash);
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.session = prophash.session;
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.cb = prophash.cb;
    this.sinkinfoextras = prophash.sinkinfoextras;
    this.ipaddress = null;
  }
  lib.inherit(LetMeInTask, Task);
  LetMeInTask.prototype.destroy = function () {
    this.ipaddress = null;
    this.sinkinfoextras = null;
    this.cb = null;
    this.representation.destroy();
    this.representation = null;
    this.session = null;
    this.identity = null;
    this.sinkname = null;
    Task.prototype.destroy.call(this);
  };
  LetMeInTask.prototype.go = function () {
    if(!this.sinkname){
      return;
    }
    taskRegistry.run('findAndRun', {
      program: {
        sinkname: this.sinkname,
        identity: {name: 'user', role: 'user'},
        task: {
          name: this.onSink.bind(this),
          propertyhash: {
            'ipaddress': 'fill yourself'
          }
        }
      }
    });
  };
  LetMeInTask.prototype.onSink = function (sinkinfo) {
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
  LetMeInTask.prototype.onEntryPointPort = function (sinkinfo, port) {
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
  LetMeInTask.prototype.onLetMeIn = function (responseobj) {
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
  LetMeInTask.prototype.onTargetSink = function (taskobj, sink) {
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
  LetMeInTask.prototype.onUserServiceSink = function (sink) {
    this.representation.setSink(sink, this.sinkinfoextras).done(
      this.finalize.bind(this, sink)
    );
  };
  LetMeInTask.prototype.finalize = function (sink) {
    this.cb({
      task: this,
      sink: sink,
      taskRegistry: taskRegistry
    });
  };
  LetMeInTask.prototype.compulsoryConstructionProperties = ['cb'];

  return LetMeInTask;
}

module.exports = createLetMeInTask;
