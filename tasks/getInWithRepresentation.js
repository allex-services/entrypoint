function createGetInWithRepresentationTask (execlib, GetInTask) {
  'use strict';
  var lib = execlib.lib,
    execSuite = execlib.execSuite;

  function GetInWithRepresentationTask (prophash) {
    GetInTask.call(this, prophash);
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.sinkinfoextras = prophash.sinkinfoextras;
  }
  lib.inherit(GetInWithRepresentationTask, GetInTask);
  GetInWithRepresentationTask.prototype.destroy = function () {
    this.sinkinfoextras = null;
    if (this.representation) {
      this.representation.destroy();
    }
    this.representation = null;
    GetInTask.prototype.destroy.call(this);
  };

  return GetInWithRepresentationTask;
}

module.exports = createGetInWithRepresentationTask;
