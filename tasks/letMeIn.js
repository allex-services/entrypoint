function createLetMeInTask (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function LetMeInTask (prophash) {
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.session = prophash.session;
    this.subsinks = prophash.subsinks;
    this.cb = prophash.cb;
  }
  lib.inherit(LetMeInTask, Task);
  LetMeInTask.prototype.destroy = function () {
    this.cb = null;
    this.subsinks = null;
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
    //TODO: what happens to `sink` later? Lost?
  };
  LetMeInTask.prototype.onUserServiceSink = function (sink) {
    if(this.subsinks){
      this.goToSubSink(0, sink);
    } else {
      this.finalize(sink);
    }
  };
  LetMeInTask.prototype.goToSubSink = function (subsinkindex, sink) {
    subsinkindex = subsinkindex || 0;
    var subsinkcount = this.subsinks ? this.subsinks.length : 0,
      subsink;
    if(subsinkindex>=subsinkcount){
      this.finalize(sink);
    } else {
      subsink = this.subsinks[subsinkindex];
      sink.subConnect(subsink.name,subsink.identity).done(
        this.goToSubSink.bind(this,subsinkindex+1),
        console.error.bind(console,'Error in subConnect-ing to',subsink.name)
      );
      //TODO: what happens to `sink` later? Lost?
    }
  };
  LetMeInTask.prototype.finalize = function (sink) {
    this.cb(sink);
  };
  LetMeInTask.prototype.compulsoryConstructionProperties = ['cb'];

  return LetMeInTask;
}

module.exports = createLetMeInTask;
