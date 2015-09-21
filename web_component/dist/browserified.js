(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ALLEX.execSuite.registry.add('allex_entrypointservice',require('./clientside')(ALLEX, ALLEX.execSuite.registry.get('allex_httpservice')));

},{"./clientside":2}],2:[function(require,module,exports){
function createClientSide(execlib,ParentServicePack) {
  'use strict';
  execlib.execSuite.UserRepresentation = require('./userrepresentationcreator')(execlib);
  var UserServiceSinkObtainerTask = require('./tasks/userservicesinkobtainercreator')(execlib),
    GetInTask = require('./tasks/getIn')(execlib, UserServiceSinkObtainerTask);
  return {
    SinkMap: require('./sinkmapcreator')(execlib, ParentServicePack),
    Tasks: [{
      name: 'letMeIn',
      klass: require('./tasks/letMeIn')(execlib, UserServiceSinkObtainerTask)
    },{
      name: 'getIn',
      klass: GetInTask
    },{
      name: 'getInWithRepresentation',
      klass: require('./tasks/getInWithRepresentation')(execlib, GetInTask)
    }]
  };
}

module.exports = createClientSide;

},{"./sinkmapcreator":5,"./tasks/getIn":8,"./tasks/getInWithRepresentation":9,"./tasks/letMeIn":10,"./tasks/userservicesinkobtainercreator":11,"./userrepresentationcreator":12}],3:[function(require,module,exports){
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
function createGetInTask (execlib, UserServiceSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function GetInTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.ep_ipaddress = prophash.ipaddress;
    this.ep_port = prophash.port;
  }
  lib.inherit(GetInTask, UserServiceSinkObtainerTask);
  GetInTask.prototype.destroy = function () {
    this.ep_port = null;
    this.ep_ipaddress = null;
    UserServiceSinkObtainerTask.prototype.destroy.call(this);
  };
  GetInTask.prototype.obtainEntryPointSink = function () {
    this.goForLetMeIn(this.ep_ipaddress, this.ep_port);
  };
  GetInTask.prototype.compulsoryConstructionProperties = ['ipaddress', 'port', 'cb'];

  return GetInTask;
}

module.exports = createGetInTask;

},{}],9:[function(require,module,exports){
function createGetInWithRepresentationTask (execlib, GetInTask) {
  'use strict';
  var lib = execlib.lib;

  function GetInWithRepresentationTask (prophash) {
    GetInTask.call(this, prophash);
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.sinkinfoextras = prophash.sinkinfoextras;
  }
  lib.inherit(GetInWithRepresentationTask, GetInTask);
  GetInWithRepresentationTask.prototype.destroy = function () {
    this.sinkinfoextras = null;
    if (this.representation) {
      this.representation.destroy();
    }
    this.representation = null;
    GetInTask.prototype.destroy.call(this);
  };

  return GetInWithRepresentationTask;
}

module.exports = createGetInWithRepresentationTask;

},{}],10:[function(require,module,exports){
function createLetMeInTask (execlib, UserServiceSinkObtainerTask) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function LetMeInTask (prophash) {
    UserServiceSinkObtainerTask.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.representation = new execSuite.UserRepresentation(prophash.eventhandlers);
    this.sinkinfoextras = prophash.sinkinfoextras;
  }
  lib.inherit(LetMeInTask, UserServiceSinkObtainerTask);
  LetMeInTask.prototype.destroy = function () {
    this.sinkinfoextras = null;
    if (this.representation) {
      this.representation.destroy();
    }
    this.representation = null;
    this.sinkname = null;
    UserServiceSinkObtainerTask.prototype.destroy.call(this);
  };
  LetMeInTask.prototype.obtainEntryPointSink = function () {
    if(!this.sinkname){
      this.cb(null);
      this.destroy();
      return;
    }
    taskRegistry.run('findAndRun', {
      program: {
        sinkname: this.sinkname,
        identity: {name: 'user', role: 'user'},
        task: {
          name: this.onEntryPointSink.bind(this),
          propertyhash: {
            'ipaddress': 'fill yourself'
          }
        }
      }
    });
  };
  LetMeInTask.prototype.compulsoryConstructionProperties = ['cb'];

  return LetMeInTask;
}

module.exports = createLetMeInTask;

},{}],11:[function(require,module,exports){
function createUserServiceSinkObtainer (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function UserServiceSinkObtainerTask (prophash) {
    Task.call(this, prophash);
    this.sinkname = prophash.sinkname || 'EntryPoint';
    this.identity = prophash.identity;
    this.propertyhash = prophash.propertyhash;
    this.cb = prophash.cb;
    this.ipaddress = null;
  }
  lib.inherit(UserServiceSinkObtainerTask, Task);
  UserServiceSinkObtainerTask.prototype.destroy = function () {
    this.ipaddress = null;
    this.cb = null;
    this.propertyhash = null;
    this.identity = null;
    this.sinkname = null;
    Task.prototype.destroy.call(this);
  };
  UserServiceSinkObtainerTask.prototype.go = function () {
    this.obtainEntryPointSink();
  };
  UserServiceSinkObtainerTask.prototype.onEntryPointSink = function (sinkinfo) {
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
  UserServiceSinkObtainerTask.prototype.onEntryPointPort = function (sinkinfo, port) {
    sinkinfo.sink.destroy();
    this.goForLetMeIn(sinkinfo.ipaddress, port);
  };
  UserServiceSinkObtainerTask.prototype.goForLetMeIn = function (address, port) {
    lib.request('http://'+address+':'+port+'/letMeIn',{
      onComplete: this.onLetMeIn.bind(this),
      parameters: this.identity
    });
  };
  UserServiceSinkObtainerTask.prototype.onLetMeIn = function (responseobj) {
    if (!(responseobj && responseobj.data)) {
      console.log('bad login', this.identity);
      this.cb(null);
      this.destroy();
    } else {
      var response, taskobj = {task:null};
        response = JSON.parse(responseobj.data);
        this.ipaddress = response.ipaddress;
      taskobj.task = taskRegistry.run('acquireSink',{
        connectionString: 'ws://'+response.ipaddress+':'+response.port,
        session: response.session,
        onSink: this.onTargetSink.bind(this, taskobj)
      });
    }
  };
  UserServiceSinkObtainerTask.prototype.onTargetSink = function (taskobj, sink) {
    if(!sink) {
      return;
    }
    lib.runNext(taskobj.task.destroy.bind(taskobj.task));
    taskobj.task = null;
    taskobj = null;
    taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this.onUserServiceSink.bind(this),
      propertyhash: this.propertyhash || {}
    });
  };
  UserServiceSinkObtainerTask.prototype.onUserServiceSink = function (sink) {
    if (this.representation) {
      this.representation.setSink(sink, this.sinkinfoextras).done(
        this.finalize.bind(this, sink)
      );
    } else {
      this.finalize(sink);
    }
  };
  UserServiceSinkObtainerTask.prototype.finalize = function (sink) {
    this.cb({
      task: this,
      sink: sink,
      taskRegistry: taskRegistry
    });
  };
  UserServiceSinkObtainerTask.prototype.compulsoryConstructionProperties = ['cb'];

  return UserServiceSinkObtainerTask;
}

module.exports = createUserServiceSinkObtainer;

},{}],12:[function(require,module,exports){
function createUserRepresentation(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    ADS = execSuite.ADS;

  function SinkActivationMonitor(defer){
    this.defer = defer;
    this.subinits = [];
    this.subdefers = [];
    this.sinksToWait = new lib.Map();
  }
  SinkActivationMonitor.prototype.destroy = function () {
    if (this.defer) {
      this.defer.resolve(null); //won't hurt if defer was already resolved/rejected
    }
    this.sinksToWait.destroy();
    this.sinksToWait = null;
    this.subdefers = null;
    this.subinits = null;
    this.defer = null;
  };
  SinkActivationMonitor.prototype.setup = function (subinit, name) {
    this.subinits.push(subinit);
    if (name) {
      this.sinksToWait.add(name, true);
    }
  };
  SinkActivationMonitor.prototype.resolve = function (result) {
    if (!this.defer) {
      return;
    }
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
  SinkActivationMonitor.prototype.add = function (name, subsinkdefer) {
    if (this.sinksToWait.get(name)) {
      this.subdefers.push(subsinkdefer);
    }
    if(this.sinksToWait.count === this.subdefers.length){
      q.allSettled(this.subdefers).done(
        this.resolve.bind(this),
        this.reject.bind(this)
      );
    }
  };

  function StateEventConsumer (consumers, cb) {
    this.consumers = consumers;
    this.activatorreference = null;
    this.deactivatorreference = null;
    this.setterreference = null;
    this.rawsetterreference = null;
    if ('function' === typeof cb) {
      this.rawsetterreference = this.consumers.rawsetterhandlers.add(cb);
    }
  }
  StateEventConsumer.prototype.destroy = function () {
    if (!this.consumers) {
      return;
    }
    if (this.activatorreference) {
      this.consumers.activatorhandlers.removeOne(this.activatorreference);
    }
    this.activatorreference = null;
    if (this.deactivatorreference) {
      this.consumers.deactivatorhandlers.removeOne(this.deactivatorreference);
    }
    this.deactivatorreference = null;
    if (this.setterreference) {
      this.consumers.setterhandlers.removeOne(this.setterreference);
    }
    this.setterreference = null;
    if (this.rawsetterreference) {
      this.consumers.rawsetterhandlers.removeOne(this.rawsetterreference);
    }
    this.rawsetterreference = null;
  };

  function StateEventConsumers(stateeventconsumers, path) {
    lib.Destroyable.call(this);
    this.sec = stateeventconsumers;
    this.path = path;
    this.ads = this.extendTo(ADS.listenToScalar([this.path], {
      activator: this._activated.bind(this),
      deactivator: this._deactivated.bind(this),
      setter: this._set.bind(this),
      rawsetter: this._setRaw.bind(this)
    }));
    this.activatorhandlers = new lib.SortedList();
    this.deactivatorhandlers = new lib.SortedList();
    this.setterhandlers = new lib.SortedList();
    this.rawsetterhandlers = new lib.SortedList();
  }
  lib.inherit(StateEventConsumers, lib.Destroyable);
  StateEventConsumers.prototype.__cleanUp = function () {
    if (!this.sec) {
      return;
    }
    this.sec.consumers.remove(this.path);
    lib.containerDestroyAll(this.activatorhandlers);
    this.activatorhandlers.destroy();
    this.activatorhandlers = null;
    lib.containerDestroyAll(this.deactivatorhandlers);
    this.deactivatorhandlers.destroy();
    this.deactivatorhandlers = null;
    lib.containerDestroyAll(this.setterhandlers);
    this.setterhandlers.destroy();
    this.setterhandlers = null;
    lib.containerDestroyAll(this.rawsetterhandlers);
    this.rawsetterhandlers.destroy();
    this.rawsetterhandlers = null;
    this.ads = null;
    this.path = null;
    this.sec = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  StateEventConsumers.prototype.add = function (cb) {
    return new StateEventConsumer(this, cb);
  };
  StateEventConsumers.prototype._activated = function () {
  };
  StateEventConsumers.prototype._deactivated = function () {
  };
  StateEventConsumers.prototype._set = function () {
  };
  StateEventConsumers.prototype._setRaw = function () {
    var args = arguments;
    this.rawsetterhandlers.traverse(function(cb){
      cb.apply(null,args);
    });
  };

  function StateEventConsumersListener(stateeventconsumerpack, listenerhash) {
    this.secp = stateeventconsumerpack;
    this.listeners = [];
    lib.traverseShallow(listenerhash, this.addConsumer.bind(this));
  }
  StateEventConsumersListener.prototype.destroy = function () {
    lib.arryDestroyAll(this.listeners);
    this.listeners = null;
  };
  StateEventConsumersListener.prototype.addConsumer = function (cb, path) {
    if (path.charAt(0) === '/'){
      path = path.substring(1);
    }
    var consumer = this.secp.consumers.get(path);
    if (!consumer) {
      consumer = new StateEventConsumers(this, path);
      this.secp.consumers.add(path, consumer);
      //secp allready attachedTo
      if(this.secp.sink){
        this.secp.sink.state.setSink(consumer.ads);
      }
    }
    this.listeners.push(consumer.add(cb));
  };

  function StateEventConsumerPack(listenerhash) {
    this.sink = null;
    this.consumers = new lib.Map();
    this.addConsumers(listenerhash);
  }
  StateEventConsumerPack.prototype.destroy = function () {
    if (!this.consumers) {
      return;
    }
    lib.containerDestroyAll(this.consumers);
    this.consumers.destroy();
    this.consumers = null;
    this.sink = null;
  };
  StateEventConsumerPack.prototype.addConsumers = function (listenerhash) {
    return new StateEventConsumersListener(this, listenerhash);
  };
  StateEventConsumerPack.prototype.attachTo = function (sink) {
    this.sink = sink;
    this.consumers.traverse(function(listeners, path){
      sink.state.setSink(listeners.ads);
    });
  };

  function delSerializer(path, delitems, item, itemname) {
    delitems.push({
      p: path.concat(itemname),
      o: 'sr',
      d: item
    });
  }
  function DataPurger(state) {
    this.state = new execSuite.StateSource();
    this._state = state;
    var path = []; 
    this.delitems = [];
    this._state.traverse(delSerializer.bind(null, path, this.delitems));
    if (this.delitems.length !== this._state.count) {
      throw new lib.Error('DELITEMS_CORRUPT', this.delitems.length+' !== '+this._state.count);
    }
  }
  DataPurger.prototype.destroy = function () {
    this.delitems = null;
    this._state = null;
    this.state.destroy();
    this.state = null;
  };
  DataPurger.prototype.run = function () {
    console.log('running delitems', this.delitems);
    this.delitems.forEach(this.runItem.bind(this));
    if (this._state.count>0) {
      console.log('_state is still not empty');
      throw new lib.Error('_STATE_STILL_NOT_EMPTY', this._state.count+' items in _state still exist');
    }
    lib.destroyASAP(this);
  };
  DataPurger.prototype.runItem = function (delitem) {
    this._state.remove(delitem.p[0]);
    this.state.handleStreamItem(delitem);
  };


  function DataEventConsumer(eventconsumers, cb){
    this.ecs = eventconsumers;
    this.subscription = this.ecs.consumers.add(cb);
  }
  DataEventConsumer.prototype.destroy = function () {
    if (this.subscription) {
      this.ecs.consumers.removeOne(this.subscription);
    }
    this.subscription = null;
    this.ecs = null;
  };

  function DataEventConsumers(){
    this.consumers = new lib.SortedList();
    this.listeners = null;
    this.hookcollection = null;
  }
  DataEventConsumers.prototype.destroy = function () {
    this.hookcollection = null;
    this.consumers.destroy();
    this.consumers = null;
    this.detach();
  };
  DataEventConsumers.prototype.attachTo = function (hookcollection) {
    this.detach();
    this.hookcollection = hookcollection;
    this.listeners = this.consumers.map(function(cons){
      return hookcollection.attach(cons);
    });
  };
  DataEventConsumers.prototype.detach = function () { //detach is "detach self from hook given in attachTo
    if(!this.listeners){
      return;
    }
    this.hookcollection = null;
    lib.containerDestroyAll(this.listeners);
    this.listeners.destroy();
    this.listeners = null;
  };
  DataEventConsumers.prototype.attach = function (cb) { //attach is "remember this cb for later attachTo"
    if(this.hookcollection){
      this.listeners.push(this.hookcollection.attach(cb));
    }
    return new DataEventConsumer(this,cb);
  };
  DataEventConsumers.prototype.fire = function () {
    var args = arguments;
    this.consumers.traverse(function (l) {
      l.apply(null,args);
    });
  };
  DataEventConsumers.prototype.fire_er = function () {
    return this.fire.bind(this);
  };

  function DataEventConsumerPack(){
    this.onInitiated = new DataEventConsumers();
    this.onRecordCreation = new DataEventConsumers();
    this.onNewRecord = new DataEventConsumers();
    this.onUpdate = new DataEventConsumers();
    this.onRecordUpdate = new DataEventConsumers();
    this.onDelete = new DataEventConsumers();
    this.onRecordDeletion = new DataEventConsumers();
  }
  DataEventConsumerPack.prototype.destroy = function () {
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
  DataEventConsumerPack.prototype.listenerPack = function () {
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
  DataEventConsumerPack.prototype.monitorForGui = function (cb) {
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
    this.sink = null;
    this.state = new lib.ListenableMap();
    this.data = [];
    this.subsinks = {};
    this.stateEvents = new StateEventConsumerPack();
    this.dataEvents = new DataEventConsumerPack();
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
    if (this.stateEvents) {
      this.stateEvents.destroy();
    }
    this.stateEvents = null;
    this.subsinks = null;
    this.data = null;
    this.state.destroy();
    this.state = null;
    this.sink = null;
  };
  SinkRepresentation.prototype.purge = function () {
    console.log('purging');
    lib.traverseShallow(this.subsinks,function (subsink) {
      subsink.purge();
      //subsink.destroy(); //this looks like a baad idea
    });
    //this.subsinks = {}; //this looks like a baad idea...
    this.purgeState();
    //this.purgeData();
  };
  SinkRepresentation.prototype.purgeState = function () {
    var dp = new DataPurger(this.state);
    this.stateEvents.attachTo(dp);
    dp.run();
    //delitems.forEach(this.onStream.bind(this));
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
    if (eventhandlers.state) {
      this.stateEvents.addConsumers(eventhandlers.state);
    }
    if (eventhandlers.data) {
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
  function setter(map, cb, cbname) {
    var mapval = map.get(cbname);
    if(lib.defined(mapval)){
      cb(mapval);
    }
  }
  SinkRepresentation.prototype.monitorStateForGui = function (listenerhash) {
    /*
    listenerhash: {
      statepath1: cb1,
      statepath2: [cb2, cb3]
    }
    */
    lib.traverseShallow(listenerhash, setter.bind(null, this.state));
    return this.stateEvents.addConsumers(listenerhash);
  };

  function sinkInfoAppender(sink, subsinkinfoextras, sinkinfo) {
    if (sinkinfo) {
      if (sinkinfo.length===1) {
        if (!sink.localSinkNames) {
          sink.localSinkNames = [];
        }
        if (sink.localSinkNames.indexOf(sinkinfo[0])<0){
          sink.localSinkNames.push(sinkinfo[0]);
        }
      } else {
        subsinkinfoextras.push(sinkinfo);
      }
    }
  }

  SinkRepresentation.prototype.setSink = function (sink, sinkinfoextras) {
    try {
    var d = q.defer(),
      subsinkinfoextras = [];
    if (this.sink) {
      this.purge();
    }
    if (!sink) {
      console.log('no sink in setSink');
      this.sink = 0; //intentionally
    } else {
      this.sink = sink;
      //console.log('at the beginning', sink.localSinkNames, '+', sinkinfoextras);
      if (sinkinfoextras) {
        sinkinfoextras.forEach(sinkInfoAppender.bind(null, sink, subsinkinfoextras));
      }
      //console.log('finally', sink.localSinkNames);
      this.handleSinkInfo(d, sink, subsinkinfoextras);
      this.stateEvents.attachTo(sink);
      if(sink.recordDescriptor){
        taskRegistry.run('materializeData',this.produceDataMaterializationPropertyHash(sink));
      }
    }
    return d.promise;
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  SinkRepresentation.prototype.produceDataMaterializationPropertyHash = function (sink) {
    var ret = this.dataEvents.listenerPack();
    ret.sink = sink;
    ret.data = this.data;
    return ret;
  };
  SinkRepresentation.prototype.handleSinkInfo = function (defer, sink, subsinkinfoextras) {
    var sinkstate = taskRegistry.run('materializeState',{
        sink: sink,
        data: this.state
        }),
        activationobj;
    if (!sink) {
      defer.resolve(0);
      return;
    }
    activationobj = new SinkActivationMonitor(defer);
    if (sink.remoteSinkNames) {
      //console.log('remote sink names', sink.remoteSinkNames);
      //sink.remoteSinkNames.forEach(this.subSinkInfo2SubInit.bind(this, false, activationobj, subsinkinfoextras));
    }
    if (sink.localSinkNames) {
      sink.localSinkNames.forEach(this.subSinkInfo2SubInit.bind(this, true, activationobj, subsinkinfoextras));
    } else if (subsinkinfoextras && subsinkinfoextras.length) {
      console.log('No localSinkNames on',sink.modulename,'but still have to do subsinkinfoextras',subsinkinfoextras);
    }
    activationobj.run(sinkstate);
  };
  SinkRepresentation.prototype.subSinkInfo2SubInit = function (sswaitable, activationobj, subsinkinfoextras, ssname) {
    var subsink = this.subsinks[ssname], 
      subsubsinkinfoextras = [];
    if (subsinkinfoextras) {
      subsinkinfoextras.forEach(function (esubsinkinfo) {
        if (esubsinkinfo[0] === ssname) {
          subsubsinkinfoextras.push(esubsinkinfo.slice(1));
        }
      });
    }
    //console.log(subsinkinfoextras, '+', ssname, '=>', subsubsinkinfoextras);
    if (!subsink) {
      //console.log('new subsink SinkRepresentation',ssname);
      subsink = new SinkRepresentation(this.subSinkEventHandlers(ssname));
      this.subsinks[ssname] = subsink;
    }
    activationobj.setup({
        name: ssname,
        identity: {name: 'user', role: 'user'},
        cb: this.subSinkActivated.bind(this, activationobj, ssname, subsink, subsubsinkinfoextras)
      },sswaitable ? ssname : null);
    /*
    if (sswaitable) {
      //console.log('will wait for', ssname);
      activationobj.subinits.push({
        name: ssname,
        identity: {name: 'user', role: 'user'},
        cb: this.subSinkActivated.bind(this, activationobj, subsink, subsubsinkinfoextras)
      });
    }
    */
  };
  SinkRepresentation.prototype.subSinkActivated = function (activationobj, ssname, subsink, subsubsinkinfoextras, subsubsink) {
    var ssp = subsink.setSink(subsubsink, subsubsinkinfoextras);
    if (activationobj && activationobj.defer && subsubsink) {
      activationobj.add(ssname, ssp);
    }
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
