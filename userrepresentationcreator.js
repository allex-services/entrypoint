function createUserRepresentation(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
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
    //console.log('setSink', sink.recordDescriptor);
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
    sink.sinkInfo.forEach(this.subSinkInfo2SubInit.bind(this, subinits));
    //console.log('running acquireSubSinks', subinits, sinkstate);
    try{
    taskRegistry.run('acquireSubSinks',{
      state: sinkstate,
      subinits: subinits
    });
    }catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  UserSinkRepresentation.prototype.subSinkInfo2SubInit = function (subinits, subsinkinfo) {
    //console.log('materialize', subsinkinfo, '?');
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

  return UserSinkRepresentation;
}

module.exports = createUserRepresentation;
