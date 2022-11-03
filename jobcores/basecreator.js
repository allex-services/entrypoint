function createBaseJobCore (lib, mylib) {
  'use strict';

  function BaseOnEntryPointJobCore (entrypoint) {
    this.entrypoint = entrypoint;
  }
  BaseOnEntryPointJobCore.prototype.destroy = function () {
    this.entrypoint = null;
  };
  BaseOnEntryPointJobCore.prototype.shouldContinue = function () {
    if (!this.entrypoint) {
      throw new lib.Error('NO_ENTRYPOINT', this.constructor.name+' needs an EntryPoint instance');
    }
    if (!this.entrypoint.destroyed) {
      throw new lib.Error('ENTRYPOINT_ALREADY_DESTROYED', this.constructor.name+' encountered a destroyed EntryPoint instance');
    }
  };

  mylib.Base = BaseOnEntryPointJobCore;
}
module.exports = createBaseJobCore;