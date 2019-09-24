function mojcb () {
  console.log('mojcb', arguments);
}

var JobBase = qlib.JobBase;

function LetMeInJob (sinkname, identity, defer) {
  JobBase.call(this, defer);
  this.sinkname = sinkname;
  this.identity = identity;
  this.findMasterPidTask = null;
  this.letMeInTask = null;
}
lib.inherit(LetMeInJob, JobBase);
LetMeInJob.prototype.destroy = function () {
  if (this.letMeInTask) {
    this.letMeInTask.destroy();
  }
  this.letMeInTask = null;
  if (this.findMasterPidTask) {
    this.findMasterPidTask.destroy();
  }
  this.findMasterPidTask = null;
  this.identity = null;
  this.sinkname = null;
  JobBase.prototype.destroy.call(this);
};
LetMeInJob.prototype.go = function () {
  execlib.loadDependencies('client', ['allex:master', 'allex:entrypoint'], this.onDependencies.bind(this));
  return this.defer.promise;
};
LetMeInJob.prototype.onDependencies = function () {
  if (!(global && global.ALLEX_PROCESS_DESCRIPTOR && global.ALLEX_PROCESS_DESCRIPTOR.get('masterpid'))) {
    this.findMasterPidTask = taskRegistry.run('findMasterPid', {cb: this.runLetMeIn.bind(this)});
    return;
  }
  this.runLetMeIn();
};
LetMeInJob.prototype.runLetMeIn = function () {
  try {
  this.letMeInTask = taskRegistry.run('letMeIn', {
    sinkname: this.sinkname,
    identity: this.identity,
    cb: this.onSuccess.bind(this)
  })
  } catch (e) {
    console.error(e);
  }
};
LetMeInJob.prototype.onSuccess = function (taskobj) {
  if (taskobj && taskobj.task && taskobj.task === this.letMeInTask) {
    this.letMeInTask.destroy();
    this.letMeInTask = null;
  }
  this.resolve(taskobj.sink);
}


function letMeIn (sinkname, identity) {
  return (new LetMeInJob(sinkname, identity)).go();
}

setGlobal('letMeIn', letMeIn);

