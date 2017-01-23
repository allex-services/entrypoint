function createClusterRepresentativeHunter (execlib) {
  'use strict';

  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function ClusterRepresentativeHunter (sinkname) {
    this.task = null;
    this.sink = null;
    this.target = {};
    console.log('SHOLD HUNT FOR CLUSTER SINK TARGET', sinkname);
    this.task = taskRegistry.run('findSink', {
      sinkname: sinkname,
      identity: {name: 'user', role: 'user' },
      onSink: this.onSink.bind(this)
    });
  }
  ClusterRepresentativeHunter.prototype.destroy = function () {
    var s = this.sink;
    this.target = null;
    this.sink = null;
    if (this.task) {
      this.task.destroy();
    }
    this.task = null;
    if (s) {
      s.destroy();
    }
  };
  ClusterRepresentativeHunter.prototype.onSink = function (sink) {
    this.sink = sink || null;
  };

  return ClusterRepresentativeHunter;
}

module.exports = createClusterRepresentativeHunter;
