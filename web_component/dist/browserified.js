(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ALLEX.execSuite.registry.add('allex_entrypointservice',require('./clientside')(ALLEX, ALLEX.execSuite.registry.get('allex_httpservice')));

},{"./clientside":2}],2:[function(require,module,exports){
function createClientSide(execlib,ParentServicePack) {
  'use strict';
  execlib.execSuite.UserRepresentation = require('./userrepresentationcreator')(execlib);
  return {
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack),
    Tasks: [{
      name: 'letMeIn',
      klass: require('./tasks/letMeIn')(execlib)
    }]
  };
}

module.exports = createClientSide;

},{"./sinkmapcreator":5,"./tasks/letMeIn":8,"./userrepresentationcreator":9}],3:[function(require,module,exports){
module.exports = {
};

},{}],4:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],5:[function(require,module,exports){
function sinkMapCreator(execlib,ParentServicePack){
  'use strict';
  var sinkmap = new (execlib.lib.Map), ParentSinkMap = ParentServicePack.SinkMap;
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib,ParentSinkMap.get('service')));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib,ParentSinkMap.get('user')));
  
  return sinkmap;
}

module.exports = sinkMapCreator;

},{"./sinks/servicesinkcreator":6,"./sinks/usersinkcreator":7}],6:[function(require,module,exports){
function createServiceSink(execlib, ParentSink) {
  'use strict';
  if(!ParentSink){
    ParentSink = execlib.execSuite.registry.get('.').SinkMap.get('user');
  }

  function ServiceSink(prophash, client) {
    ParentSink.call(this, prophash, client);
  }
  ParentSink.inherit(ServiceSink, require('../methoddescriptors/serviceuser'));
  ServiceSink.prototype.__cleanUp = function() {
    ParentSink.prototype.__cleanUp.call(this);
  };
  return ServiceSink;
}

module.exports = createServiceSink;

},{"../methoddescriptors/serviceuser":3}],7:[function(require,module,exports){
function createUserSink(execlib, ParentSink) {
  'use strict';
  if(!ParentSink){
    ParentSink = execlib.execSuite.registry.get('.').SinkMap.get('user');
  }

  function UserSink(prophash, client) {
    ParentSink.call(this, prophash, client);
  }
  ParentSink.inherit(UserSink, require('../methoddescriptors/user'));
  UserSink.prototype.__cleanUp = function() {
    ParentSink.prototype.__cleanUp.call(this);
  };
  return UserSink;
}

module.exports = createUserSink;

},{"../methoddescriptors/user":4}],8:[function(require,module,exports){
function createLetMeInTask (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function LetMeInTask (prophash) {
    console.log('LetMeInTask', prophash);
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.session = prophash.session;
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.cb = prophash.cb;
    this.sinkinfoextras = prophash.sinkinfoextras;
    this.ipaddress = null;
  }
  lib.inherit(LetMeInTask, Task);
  LetMeInTask.prototype.destroy = function () {
    this.ipaddress = null;
    this.sinkinfoextras = null;
    this.cb = null;
    this.representation.destroy();
    this.representation = null;
    this.session = null;
    this.identity = null;
    this.sinkname = null;
    Task.prototype.destroy.call(this);
  };
  LetMeInTask.prototype.go = function () {
    if(!this.sinkname){
      return;
    }
    taskRegistry.run('findAndRun', {
      program: {
        sinkname: this.sinkname,
        identity: {name: 'user', role: 'user'},
        task: {
          name: this.onSink.bind(this),
          propertyhash: {
            'ipaddress': 'fill yourself'
          }
        }
      }
    });
  };
  LetMeInTask.prototype.onSink = function (sinkinfo) {
    if(!sinkinfo.sink){
      return;
    }
    taskRegistry.run('readState', {
      state: taskRegistry.run('materializeState', {
        sink: sinkinfo.sink
      }),
      name: 'port',
      cb: this.onEntryPointPort.bind(this,sinkinfo)
    });
  };
  LetMeInTask.prototype.onEntryPointPort = function (sinkinfo, port) {
    sinkinfo.sink.destroy();
    try {
      lib.request('http://'+sinkinfo.ipaddress+':'+port+'/letMeIn',{
        onComplete: this.onLetMeIn.bind(this),
        parameters: this.identity
      });
    }
    catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  LetMeInTask.prototype.onLetMeIn = function (responseobj) {
    if (!(responseobj && responseobj.data)) {
      this.cb(null);
    } else {
      var response, taskobj = {task:null};
      try {
        response = JSON.parse(responseobj.data);
        this.ipaddress = response.ipaddress;
        taskobj.task = taskRegistry.run('acquireSink',{
          connectionString: 'ws://'+response.ipaddress+':'+response.port,
          session: response.session,
          onSink: this.onTargetSink.bind(this, taskobj)
        });
      } catch (e) {
        console.error(responseobj,'=>',e.stack);
        console.error(e);
        this.cb(null);
      }
    }
  };
  LetMeInTask.prototype.onTargetSink = function (taskobj, sink) {
    if(!sink) {
      return;
    }
    lib.runNext(taskobj.task.destroy.bind(taskobj.task));
    taskobj.task = null;
    taskobj = null;
    taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this.onUserServiceSink.bind(this)
    });
  };
  LetMeInTask.prototype.onUserServiceSink = function (sink) {
    this.representation.setSink(sink, this.sinkinfoextras).done(
      this.finalize.bind(this, sink)
    );
  };
  LetMeInTask.prototype.finalize = function (sink) {
    this.cb({
      task: this,
      sink: sink,
      taskRegistry: taskRegistry
    });
  };
  LetMeInTask.prototype.compulsoryConstructionProperties = ['cb'];

  return LetMeInTask;
}

module.exports = createLetMeInTask;

},{}],9:[function(require,module,exports){
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
    var wasfull = this.data.length>0;
    while (this.data.length) {
      this.dataEvents.onRecordDeletion.fire(this.data.pop());
    }
    if (wasfull) {
      this.dataEvents.onDelete.fire(null);
    }
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

},{}]},{},[1]);
