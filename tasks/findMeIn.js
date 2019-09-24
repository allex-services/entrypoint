function createFindMeInTask (execlib, LetMeInTask) {
  'use strict';
  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function FindMeInTask(prophash) {
    LetMeInTask.call(this, prophash);
    this.sinkname = prophash.sinkname;
  }
  lib.inherit(FindMeInTask, LetMeInTask);

  FindMeInTask.prototype.obtainEntryPointSink = function () {
    this.task = taskRegistry.run('findSink', {
      sinkname: this.sinkname,
      identity: this.identity,
      onSink: this.onUserServiceSink.bind(this, null)
    });
  };

  FindMeInTask.prototype.compulsoryConstructionProperties = ['sinkname'];

  return FindMeInTask;
}

module.exports = createFindMeInTask;
