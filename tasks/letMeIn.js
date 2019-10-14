function createLetMeInTask (execlib, UserServiceViaEntryPointSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function LetMeInTask (prophash) {
    UserServiceViaEntryPointSinkObtainerTask.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.sinkinfoextras = prophash.sinkinfoextras;
  }
  lib.inherit(LetMeInTask, UserServiceViaEntryPointSinkObtainerTask);
  LetMeInTask.prototype.destroy = function () {
    this.sinkinfoextras = null;
    if (this.representation) {
      this.representation.destroy();
    }
    this.representation = null;
    this.sinkname = null;
    UserServiceViaEntryPointSinkObtainerTask.prototype.destroy.call(this);
  };
  LetMeInTask.prototype.obtainEntryPointSink = function () {
    if(!this.sinkname){
      this.cb(null);
      this.destroy();
      return;
    }
    this.task = taskRegistry.run('findAndRun', {
      program: {
        sinkname: this.sinkname,
        identity: {name: 'user', role: 'user'},
        task: {
          name: this.onEntryPointSink.bind(this),
          propertyhash: {
            'ipaddress': 'fill yourself'
          }
        }
      }
    });
  };
  LetMeInTask.prototype.compulsoryConstructionProperties = ['cb'];

  return LetMeInTask;
}

module.exports = createLetMeInTask;
