function createAllexResponse (execlib) {
  'use strict';

  var lib = execlib.lib,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;

  function AllexResponse (defer) {
    JobBase.call(this, defer);
  }
  lib.inherit(AllexResponse, JobBase);
  AllexResponse.prototype.end = function (string) {
    try {
      this.resolve(JSON.parse(string));
    }
    catch (ignore) {
      this.resolve(string);
    }
  };

  return AllexResponse;
}

module.exports = createAllexResponse;
