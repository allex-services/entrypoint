function createUserRepresentation(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function SinkActivationMonitor(defer){
    this.defer = defer;
    this.subinits = [];
    this.subdefers = [];
  }
  SinkActivationMonitor.prototype.destroy = function () {
    this.subdefers = null;
    this.subinits = null;
    this.defer = null;
  };
  SinkActivationMonitor.prototype.resolve = function (result) {
    this.defer.resolve(result);
    this.destroy();
  };
  SinkActivationMonitor.prototype.reject = function (reason) {
    this.defer.reject(reason);
    this.destroy();
  };
  SinkActivationMonitor.prototype.run = function (sinkstate) {
    if(this.subinits.length){
      taskRegistry.run('acquireSubSinks',{
        state: sinkstate,
        subinits: this.subinits
      });
    } else {
      this.resolve(0);
    }
  };
  SinkActivationMonitor.prototype.add = function (subsinkdefer) {
    this.subdefers.push(subsinkdefer);
    if(this.subinits.length === this.subdefers.length){
      q.allSettled(this.subdefers).done(
        this.resolve.bind(this),
        this.reject.bind(this)
      );
    }
  };

  function EventConsumer(eventconsumers, cb){
    this.ecs = eventconsumers;
    this.subscription = this.ecs.consumers.add(cb);
  }
  EventConsumer.prototype.destroy = function () {
    if (this.subscription) {
      this.ecs.consumers.removeOne(this.subscription);
    }
    this.subscription = null;
    this.ecs = null;
  };

  function EventConsumers(){
    this.consumers = new lib.SortedList();
    this.listeners = null;
    this.hookcollection = null;
  }
  EventConsumers.prototype.destroy = function () {
    this.hookcollection = null;
    this.consumers.destroy();
    this.consumers = null;
    this.detach();
  };
  EventConsumers.prototype.attachTo = function (hookcollection) {
    this.detach();
    this.hookcollection = hookcollection;
    this.listeners = this.consumers.map(function(cons){
      return hookcollection.attach(cons);
    });
  };
  EventConsumers.prototype.detach = function () { //detach is "detach self from hook given in attachTo
    if(!this.listeners){
      return;
    }
    this.hookcollection = null;
    lib.containerDestroyAll(this.listeners);
    this.listeners.destroy();
    this.listeners = null;
  };
  EventConsumers.prototype.attach = function (cb) { //attach is "remember this cb for later attachTo"
    if(this.hookcollection){
      this.listeners.push(this.hookcollection.attach(cb));
    }
    return new EventConsumer(this,cb);
  };
  EventConsumers.prototype.fire = function () {
    var args = arguments;
    this.consumers.traverse(function (l) {
      l.apply(null,args);
    });
  };
  EventConsumers.prototype.fire_er = function () {
    return this.fire.bind(this);
  };

  function DataEventConsumers(){
    this.onInitiated = new EventConsumers();
    this.onRecordCreation = new EventConsumers();
    this.onNewRecord = new EventConsumers();
    this.onUpdate = new EventConsumers();
    this.onRecordUpdate = new EventConsumers();
    this.onDelete = new EventConsumers();
    this.onRecordDeletion = new EventConsumers();
  }
  DataEventConsumers.prototype.destroy = function () {
    this.onInitiated.destroy();
    this.onInitiated = null;
    this.onRecordCreation.destroy();
    this.onRecordCreation = null;
    this.onNewRecord.destroy();
    this.onNewRecord = null;
    this.onUpdate.destroy();
    this.onUpdate = null;
    this.onRecordUpdate.destroy();
    this.onRecordUpdate = null;
    this.onDelete.destroy();
    this.onDelete = null;
    this.onRecordDeletion.destroy();
    this.onRecordDeletion = null;
  };
  DataEventConsumers.prototype.listenerPack = function () {
    var orc = this.onRecordCreation;
    return {
      onInitiated: this.onInitiated.fire_er(),
      onRecordCreation: this.onRecordCreation.fire_er(),
      onNewRecord: this.onNewRecord.fire_er(),
      onUpdate: this.onUpdate.fire_er(),
      onRecordUpdate: this.onRecordUpdate.fire_er(),
      onDelete: this.onDelete.fire_er(),
      onRecordDeletion: this.onRecordDeletion.fire_er()
    };
  };
  DataEventConsumers.prototype.monitorForGui = function (cb) {
    return new DataMonitorForGui(this, cb);
  };

  function DataMonitorForGui(dataeventconsumers, cb){
    this.onInitiatedListener = dataeventconsumers.onInitiated.attach(cb);
    this.onNewRecordListener = dataeventconsumers.onNewRecord.attach(cb);
    this.onUpdateListener = dataeventconsumers.onUpdate.attach(cb);
    this.onDeleteListener = dataeventconsumers.onDelete.attach(cb);
  }
  DataMonitorForGui.prototype.destroy = function () {
    if (this.onInitiatedListener) {
      this.onInitiatedListener.destroy();
    }
    this.onInitiatedListener = null;
    if (this.onNewRecordListener) {
      this.onNewRecordListener.destroy();
    }
    this.onNewRecordListener = null;
    if (this.onUpdateListener) {
      this.onUpdateListener.destroy();
    }
    this.onUpdateListener = null;
    if (this.onDeleteListener) {
      this.onDeleteListener.destroy();
    }
    this.onDeleteListener = null;
  };

  function SinkRepresentation(eventhandlers){
    this.state = new lib.Map();
    this.data = [];
    this.subsinks = {};
    this.dataEvents = new DataEventConsumers();
    console.log('eventhandlers', eventhandlers);
    this.eventHandlers = eventhandlers;
    this.connectEventHandlers(eventhandlers);
  }
  SinkRepresentation.prototype.destroy = function () {
    //TODO: all the destroys need to be called here
    this.eventHandlers = null;
    if (this.dataEvents) {
      this.dataEvents.destroy();
    }
    this.dataEvents = null;
    this.subsinks = null;
    this.data = null;
    this.state.destroy();
    this.state = null;
  };
  SinkRepresentation.prototype.purge = function () {
    lib.traverseShallow(this.subsinks,function (subsink) {
      subsink.purge();
      subsink.destroy();
    });
    this.subsinks = {};
    this.purgeState();
    this.purgeData();
  };
  SinkRepresentation.prototype.purgeState = function () {
    if (this.state) {
      //here this.state should be recursively traversed for each and every element
      //so that each element is cleanly deleted with proper event being fired
      this.state.destroy();
    }
    this.state = new lib.Map();
  };
  SinkRepresentation.prototype.purgeData = function () {
    var rdf = this.dataEvents.onRecordDeletion.fire_er();
    this.data.forEach(function(record){
      rdf(record);
    });
    this.dataEvents.onDelete.fire(null);
    this.data = [];
  };
  SinkRepresentation.prototype.connectEventHandlers = function (eventhandlers) {
    if (!eventhandlers) {
      return;
    }
    try {
    if (eventhandlers.data) {
      var de = this.dataEvents;
      lib.traverseShallow(eventhandlers.data, this.attachDataEventHandler.bind(this));
    }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  SinkRepresentation.prototype.attachDataEventHandler = function (handler, eventname) {
    var de = this.dataEvents[eventname];
    if (!de) {
      return;
    }
    return de.attach(handler);
  };
  SinkRepresentation.prototype.monitorDataForGui = function (cb) {
    return this.dataEvents.monitorForGui(cb);
  };

  function addNameTo(name, namedhasharry) {
    if (!namedhasharry.some(function (nh) {
      return nh.name === name;
    })){
      namedhasharry.push ({name: name});
    }
  }

  SinkRepresentation.prototype.setSink = function (sink, sinkinfoextras) {
    var d = q.defer(),
      subsinkinfoextras = [];
    if (!sink) {
    } else {
      if (sinkinfoextras && !sink.sinkInfo) {
        sink.sinkInfo = [];
      }
      //console.log('at the beginning', sink.sinkInfo, '+', sinkinfoextras);
      if (sinkinfoextras) {
        sinkinfoextras.forEach(function (sinkinfo) {
          if (sinkinfo) {
            if (sinkinfo.length===1) {
              addNameTo(sinkinfo[0], sink.sinkInfo);
            } else {
              subsinkinfoextras.push(sinkinfo);
            }
          }
        });
      }
      //console.log('finally', sink.sinkInfo);
      if(sink.recordDescriptor){
        taskRegistry.run('materializeData',this.produceDataMaterializationPropertyHash(sink));
      }
      this.handleSinkInfo(d, sink, subsinkinfoextras);
    }
    return d.promise;
  };
  SinkRepresentation.prototype.produceDataMaterializationPropertyHash = function (sink) {
    var ret = this.dataEvents.listenerPack();
    ret.sink = sink;
    ret.data = this.data;
    console.log('returning',ret);
    return ret;
  };
  SinkRepresentation.prototype.handleSinkInfo = function (defer, sink, subsinkinfoextras) {
    var sinkstate = taskRegistry.run('materializeState',{
        sink: sink,
        data: this.state
        }),
        activationobj;
    if (!(sink && sink.sinkInfo)) {
      defer.resolve(0);
      return;
    }
    activationobj = new SinkActivationMonitor(defer);
    if (sink.sinkInfo) {
      sink.sinkInfo.forEach(this.subSinkInfo2SubInit.bind(this, activationobj, subsinkinfoextras));
    } else if (subsinkinfoextras) {
      console.log('but still',subsinkinfoextras);
    }
    activationobj.run(sinkstate);
  };
  SinkRepresentation.prototype.subSinkInfo2SubInit = function (activationobj, subsinkinfoextras, subsinkinfo) {
    var subsink = this.subsinks[subsinkinfo.name], 
      subsubsinkinfoextras = [];
    if (subsinkinfoextras) {
      subsinkinfoextras.forEach(function (esubsinkinfo) {
        if (esubsinkinfo[0] === subsinkinfo.name) {
          subsubsinkinfoextras.push(esubsinkinfo.slice(1));
        }
      });
    }
    //console.log(subsinkinfoextras, '+', subsinkinfo.name, '=>', subsubsinkinfoextras);
    if (!subsink) {
      subsink = new SinkRepresentation(this.subSinkEventHandlers(subsinkinfo.name));
      this.subsinks[subsinkinfo.name] = subsink;
    }
    activationobj.subinits.push({
      name: subsinkinfo.name,
      identity: {name: 'user', role: 'user'},
      cb: this.subSinkActivated.bind(this, activationobj, subsink, subsubsinkinfoextras)//subsink.setSink.bind(subsink)
    });
  };
  SinkRepresentation.prototype.subSinkActivated = function (activationobj, subsink, subsubsinkinfoextras, subsubsink) {
    activationobj.add(subsink.setSink(subsubsink, subsubsinkinfoextras));
  };
  SinkRepresentation.prototype.subSinkEventHandlers = function (subsinkname) {
    if (!this.eventHandlers) {
      return;
    }
    if (!this.eventHandlers.sub) {
      return;
    }
    return this.eventHandlers.sub[subsinkname];
  };

  function UserSinkRepresentation(eventhandlers){
    SinkRepresentation.call(this, eventhandlers);
  }
  lib.inherit(UserSinkRepresentation, SinkRepresentation);

  return UserSinkRepresentation;
}

module.exports = createUserRepresentation;
