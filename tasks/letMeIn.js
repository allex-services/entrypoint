function createLetMeInTask (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function SinkRepresentation(){
    this.state = {};
    this.data = [];
    this.subsinks = {};
    this.sink = null;
  }
  SinkRepresentation.prototype.destroy = function () {
    //TODO: all the destroys need to be called here
    this.sink = null;
    this.subsinks = null;
    this.data = null;
    this.state = null;
  };
  SinkRepresentation.prototype.setSink = function (sink) {
    console.log('setSink', sink.recordDescriptor);
    this.sink = sink;
    taskRegistry.run('materializeState',{
      sink: sink,
      data: this.state
    });
    if(sink.recordDescriptor){
      taskRegistry.run('materializeData',{
        sink: sink,
        data: this.data,
        onRecordCreation: console.log.bind(console,'record')
      });
    }
  };

  function UserSinkRepresentation(){
    SinkRepresentation.call(this);
  }
  lib.inherit(UserSinkRepresentation, SinkRepresentation);
  UserSinkRepresentation.prototype.setSink = function (sink) {
    var sinkstate = taskRegistry.run('materializeState',{sink: sink}),
      subinits = [];
    sink.sinkInfo.forEach(this.onSubSinkInfo.bind(this, subinits));
    console.log('running acquireSubSinks', subinits, sinkstate);
    try{
    taskRegistry.run('acquireSubSinks',{
      state: sinkstate,
      subinits: subinits,
      debug:true
    });
    }catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  UserSinkRepresentation.prototype.onSubSinkInfo = function (subinits, subsinkinfo) {
    console.log('materialize', subsinkinfo, '?');
    var subsink = this.subsinks[subsinkinfo.name];
    if (!subsink) {
      subsink = new SinkRepresentation();
      this.subsinks[subsinkinfo.name] = subsink;
    }
    subinits.push({
      name: subsinkinfo.name,
      identity: {name: 'user', role: 'user'},
      cb: subsink.setSink.bind(subsink)
    });
  };

  function LetMeInTask (prophash) {
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.session = prophash.session;
    this.representation = new UserSinkRepresentation();
    this.cb = prophash.cb;
    this.ipaddress = null;
    this.sinks = [];
  }
  lib.inherit(LetMeInTask, Task);
  LetMeInTask.prototype.destroy = function () {
    this.sinks = null; //TODO: containerDestroyAll
    this.ipaddress = null;
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
    this.sinks.push(sink);
    lib.runNext(taskobj.task.destroy.bind(taskobj.task));
    taskobj.task = null;
    taskobj = null;
    taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this.onUserServiceSink.bind(this)
    });
  };
  LetMeInTask.prototype.onUserServiceSink = function (sink) {
    this.representation.setSink(sink);
    if(sink.sinkInfo && sink.sinkInfo.length){
      this.goToSubSink(0, sink);
    } else {
      this.finalize(sink);
    }
  };
  LetMeInTask.prototype.goToSubSink = function (subsinkindex, sink) {
    subsinkindex = subsinkindex || 0;
    var subsinkcount = sink.sinkInfo ? sink.sinkInfo.length : 0,
      subsink;
    this.sinks.push(sink);
    if(subsinkindex>=subsinkcount){
      this.finalize(sink);
    } else {
      subsink = sink.sinkInfo[subsinkindex];
      sink.subConnect(subsink.name,subsink.identity).done(
        this.onSubSink.bind(this, subsinkindex, sink),
        console.error.bind(console,'Error in subConnect-ing to',subsink.name)
      );
    }
  };
  LetMeInTask.prototype.onSubSink = function (subsinkindex, sink, subsink) {
    this.goToSubSink.bind(this, subsinkindex+1, sink);
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
