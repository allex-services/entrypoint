function createTargetHunterJobCore (execlib, mylib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    Base = mylib.Base;

  function TargetHunterJobCore (entrypoint, sinkname) {
    Base.call(this, entrypoint);
    this.sinkname = sinkname;
    this.sinkinfo = null;
  }
  lib.inherit(TargetHunterJobCore, Base);
  TargetHunterJobCore.prototype.destroy = function () {
    this.sinkinfo = null;
    this.sinkname = null;
    Base.prototype.destroy.call(this);
  };
  TargetHunterJobCore.prototype.shouldContinue = function () {
    var ret = Base.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!this.sinkname) {
      return new lib.Error('NO_SINKNAME_TO_HUNT', this.constructor.name+' needs a sinkname');
    }
  };

  TargetHunterJobCore.prototype.find = function () {
    console.log('SHOULD HUNT FOR SINGLE TARGET', this.sinkname);
    var d = q.defer(), ret = d.promise;
    taskRegistry.run('findAndRun',{
      program: {
        sinkname: this.sinkname,
        identity: {name:'service',role:'service'},
        task:{
          name: d.resolve.bind(d),
          propertyhash:{
            ipaddress: 'fill yourself',
            httpport: 'fill yourself'
          }
        }
      }
    });
    d = null;
    return ret;
  };
  TargetHunterJobCore.prototype.onFind = function (sinkinfo) {
    this.sinkinfo = sinkinfo;
  };
  function resolverOfTwo (defer, one, two) {
    defer.resolve([one, two]);
  }
  TargetHunterJobCore.prototype.doNat = function () {
    var d = q.defer(), ret = d.promise;
    taskRegistry.run('natThis', {
      iaddress: this.sinkinfo.ipaddress,
      iport: this.sinkinfo.httpport,
      cb: resolverOfTwo.bind(null, d),
      singleshot: true
    });
    d = null;
    return ret;
  };
  TargetHunterJobCore.prototype.onDoNat = function (addrandport) {
    this.sinkinfo.ipaddress = addrandport[0];
    this.sinkinfo.httpport = addrandport[1];
  };
  TargetHunterJobCore.prototype.finalize = function () {
    return this.sinkinfo;
  }

  TargetHunterJobCore.prototype.steps = [
    'find',
    'onFind',
    'doNat',
    'onDoNat',
    'finalize'
  ];

  mylib.TargetHunter = TargetHunterJobCore;
}
module.exports = createTargetHunterJobCore;