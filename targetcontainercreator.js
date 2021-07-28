function createTargetContainer(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    Destroyable = lib.Destroyable;

  function TargetContainer(sinkname,sinkinfo){
    Destroyable.call(this);
    console.log('single target found',sinkinfo.ipaddress,':',sinkinfo.httpport);
    this.name = sinkname;
    this.sink = sinkinfo.sink;
    this.address = sinkinfo.ipaddress;
    this.port = sinkinfo.httpport;
    //clear the sinkinfo
    sinkinfo.sink = null;
    sinkinfo.ipaddress = null;
    this.sink.destroyed.attachForSingleShot(this.destroy.bind(this));
  }
  lib.inherit(TargetContainer, Destroyable);
  TargetContainer.prototype.__cleanUp = function(){
    this.address = null;
    this.port = null;
    if(this.sink){
      this.sink.destroy();
    }
    this.sink = null;
    this.name = null;
    Destroyable.prototype.__cleanUp.call(this);
  };
  return TargetContainer;
}

module.exports = createTargetContainer;
