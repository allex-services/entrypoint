function createBaseOnResponseJobCore (lib, mylib) {
  'use strict';

  var Base = mylib.Base;

  function BaseOnResponseJobCore (entrypoint, response) {
    Base.call(this, entrypoint);
    this.response = response;
  }
  lib.inherit(BaseOnResponseJobCore, Base);
  BaseOnResponseJobCore.prototype.destroy = function () {
    this.response = null;
    Base.prototype.destroy.call(this);
  };
  BaseOnResponseJobCore.prototype.finalResult = function () {
    if (this.response.writableEnded) {
      return this.finalResultBecauseResponseEnded();
    }
  };
  BaseOnResponseJobCore.prototype.finalResultBecauseResponseEnded = function () {
    return true;
  };
  BaseOnResponseJobCore.prototype.endResponse = function (thingy) {
    if (this.response && !this.response.writableEnded) {
      this.response.end(JSON.stringify(thingy));
    }
  };
  BaseOnResponseJobCore.prototype.endResponseWithError = function (error) {
    if (this.response && !this.response.writableEnded) {
      this.endResponse(error && error.code ? {error: error.code} : {});
    }
  };

  var qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function JobOnResponse (steppedinstance, defer) {
    SteppedJobOnSteppedInstance.call(this, steppedinstance, defer);
    this.response = steppedinstance.response;
  }
  lib.inherit(JobOnResponse, SteppedJobOnSteppedInstance);
  JobOnResponse.prototype.destroy = function () {
    this.response = null;
    SteppedJobOnSteppedInstance.prototype.destroy.call(this);
  };
  JobOnResponse.prototype.reject = function (reason) {
    console.log(this.constructor.name, 'rejected with', reason);
    if (this.response && !this.response.writableEnded) {
      this.response.end('{}');
    }
    SteppedJobOnSteppedInstance.prototype.reject.call(this, reason);
  };

  mylib.BaseOnResponse = BaseOnResponseJobCore;
  mylib.newResponseJob = function (steppedinstance, defer) {
    return new JobOnResponse(steppedinstance, defer);
  };
}
module.exports = createBaseOnResponseJobCore;