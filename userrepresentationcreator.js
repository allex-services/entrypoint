function createUserRepresentation(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function SinkActivationMonitor(defer){
    this.defer = defer;
    this.subinits = [];
    this.subdefers = [];
  }
  SinkActivationMonitor.prototype.destroy = function () {
    this.subdefers = null;
    this.subinits = null;
    this.defer = null;
  };
  SinkActivationMonitor.prototype.resolve = function (result) {
    this.defer.resolve(result);
    this.destroy();
  };
  SinkActivationMonitor.prototype.reject = function (reason) {
    this.defer.reject(reason);
    this.destroy();
  };
  SinkActivationMonitor.prototype.run = function (sinkstate) {
    if(this.subinits.length){
      taskRegistry.run('acquireSubSinks',{
        state: sinkstate,
        subinits: this.subinits
      });
    } else {
      this.resolve(0);
    }
  };
  SinkActivationMonitor.prototype.add = function (subsinkdefer) {
    this.subdefers.push(subsinkdefer);
    if(this.subinits.length === this.subdefers.length){
      q.allSettled(this.subdefers).done(
        this.resolve.bind(this),
        this.reject.bind(this)
      );
    }
  };

  function SinkRepresentation(){
    this.state = new lib.Map;
    this.data = [];
    this.subsinks = {};
    this.sink = null;
  }
  SinkRepresentation.prototype.destroy = function () {
    //TODO: all the destroys need to be called here
    this.sink = null;
    this.subsinks = null;
    this.data = null;
    this.state.destroy();
    this.state = null;
  };
  SinkRepresentation.prototype.setSink = function (sink) {
    var d = q.defer();
    this.sink = sink;
    if (!sink) {
    } else {
      if(sink.recordDescriptor){
        taskRegistry.run('materializeData',{
          sink: sink,
          data: this.data,
          onRecordCreation: console.log.bind(console,'record')
        });
      }
      this.handleSinkInfo(d);
    }
    return d.promise;
  };
  SinkRepresentation.prototype.handleSinkInfo = function (defer) {
    var sinkstate = taskRegistry.run('materializeState',{
        sink: this.sink,
        data: this.state
        }),
        activationobj;
    if (!(this.sink && this.sink.sinkInfo)) {
      defer.resolve(0);
      return;
    }
    activationobj = new SinkActivationMonitor(defer);
    this.sink.sinkInfo.forEach(this.subSinkInfo2SubInit.bind(this, activationobj));
    activationobj.run(sinkstate);
  };
  SinkRepresentation.prototype.subSinkInfo2SubInit = function (activationobj, subsinkinfo) {
    var subsink = this.subsinks[subsinkinfo.name];
    if (!subsink) {
      subsink = new SinkRepresentation();
      this.subsinks[subsinkinfo.name] = subsink;
    }
    activationobj.subinits.push({
      name: subsinkinfo.name,
      identity: {name: 'user', role: 'user'},
      cb: this.subSinkActivated.bind(this, activationobj, subsink)//subsink.setSink.bind(subsink)
    });
  };
  SinkRepresentation.prototype.subSinkActivated = function (activationobj, subsink, subsubsink) {
    activationobj.add(subsink.setSink(subsubsink));
  };

  function UserSinkRepresentation(){
    SinkRepresentation.call(this);
  }
  lib.inherit(UserSinkRepresentation, SinkRepresentation);

  return UserSinkRepresentation;
}

module.exports = createUserRepresentation;
