function createTargetContainer(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function TargetContainer(sinkname,sinkinfo){
    this.name = sinkname;
    this.sink = sinkinfo.sink;
    this.address = sinkinfo.ipaddress;
    this.port = sinkinfo.wsport;
    //clear the sinkinfo
    sinkinfo.sink = null;
    sinkinfo.ipaddress = null;
  }
  TargetContainer.prototype.destroy = function(){
    this.ipaddress = null;
    if(this.sink){
      this.sink.destroy();
    }
    this.sink = null;
    this.name = null;
  };
  return TargetContainer;
}

module.exports = createTargetContainer;
