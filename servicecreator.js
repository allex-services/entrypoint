var Url = require('url');

function createEntryPointService(execlib, ParentServicePack) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    ParentService = ParentServicePack.Service,
    TargetContainer = require('./targetcontainercreator')(execlib);

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user')) 
    };
  }

  function EntryPointService(prophash) {
    if(!prophash){
      throw new lib.Error('NO_PROPHASH_FOR_ENTRYPOINT_SERVICE','EntryPointService needs a prophash in constructor');
    }
    if(!prophash.port){
      throw new lib.Error('NO_PROPHASH_PORT_FOR_ENTRYPOINT_SERVICE','EntryPointService constructor prophash misses the port number');
    }
    if(!prophash.target){
      throw new lib.Error('NO_PROPHASH_TARGET_FOR_ENTRYPOINT_SERVICE','EntryPointService constructor prophash misses the target string');
    }
    if(!prophash.strategies){
      throw new lib.Error('NO_PROPHASH_STRATEGIES_FOR_ENTRYPOINT_SERVICE','EntryPointService constructor prophash misses the strategies hash');
    }
    this.port = prophash.port;
    ParentService.call(this, prophash);
    this.state.set('port',this.port);
    this.allowAnonymous = prophash.allowAnonymous;
    this.authenticator = null;
    this.targets = new lib.Map();
    this.remoteDBSink = null;
    this.remoteDBSinkFinder = null;
    execSuite.acquireAuthSink(prophash.strategies).done(
      this.onAuthenticator.bind(this),
      this.close.bind(this)
    );
    if (prophash && prophash.strategies && prophash.strategies.remote){
      this.remoteDBSinkFinder = taskRegistry.run('findSink', {
        sinkname: prophash.strategies.remote.sinkname,
        identity: prophash.strategies.remote.identity,
        onSink: this.onRemoteDBSink.bind(this)
      });
    }
    this.strategynames = Object.keys(prophash.strategies);
    this.sessionsSinkName = prophash.sessionsDB;
    this.sessionsWriterSink = null;
    if (this.sessionsSinkName) {
      taskRegistry.run('findSink', {
        sinkname: this.sessionsSinkName,
        identity: {
          name: 'user',
          role: 'writer',
        },
        onSink: this.onSessionsWriterSink.bind(this)
      });
    }
    this.processTarget(prophash.target);
  }
  ParentService.inherit(EntryPointService,factoryCreator);
  EntryPointService.prototype.__cleanUp = function () {
    if (this.sessionsWriterSink) {
      this.sessionsWriterSink.destroy();
    }
    this.sessionsWriterSink = null;
    this.sessionsSinkName = null;
    this.strategynames = null;
    if(!this.targets){
      return;
    }
    if(this.remoteDBSinkFinder){
      this.remoteDBSinkFinder.destroy();
    }
    this.remoteDBSinkFinder = null;
    if(this.remoteDBSink){
      this.remoteDBSink.destroy();
    }
    this.remoteDBSink = null;
    if(this.authenticator){
      this.authenticator.destroy();
    }
    this.authenticator = null;
    this.allowAnonymous = null;
    lib.containerDestroyAll(this.targets);
    this.targets.destroy();
    this.targets = null;
    this.port = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  EntryPointService.prototype.acquirePort = function(defer){
    console.log('MY PORT',this.port);
    defer.resolve(this.port);
  };
  EntryPointService.prototype._onRequest = function(req,res){
    var url = Url.parse(req.url,true),
      query = url.query,
      mymethodname = url.pathname.substring(1),
      mymethod = this[mymethodname],
      isanonymous = this.anonymousMethods.indexOf(mymethodname)>=0,
      targetmethodlength = isanonymous ? 3 : 3;
    //any mymethod has to accept (url,req,res),
    if('function' !== typeof mymethod){
      res.end();
      return;
    }
    if(mymethod.length!==targetmethodlength){
      res.end(mymethodname+' length '+mymethod.length+' is not '+targetmethodlength);
      return;
    }
    if (isanonymous) {
      if (this.allowAnonymous) {
        mymethod.call(this, url, req, res);
      } else {
        res.end();
      }
    } else {
      mymethod.call(this, url, req, res);
    }
  };
  EntryPointService.prototype.authenticate = function(credentials){
    if(!this.strategynames){
      var d = q.defer();
      d.resolve(null);
      return d.promise;
    }
    var resolveobj = {};
    this.strategynames.forEach(function(stratname){
      resolveobj[stratname] = credentials;
    });
    return this.authenticator.call('resolve',resolveobj);
  };
  EntryPointService.prototype.onAuthenticator = function (authsink) {
    if(!this.destroyed){
      authsink.destroy();
      return;
    }
    this.authenticator = authsink;
  };
  EntryPointService.prototype.onRemoteDBSink = function (remotedbsink) {
    if(!this.destroyed){
      remotedbsink.destroy();
      return;
    }
    this.remoteDBSink = remotedbsink;
  };
  EntryPointService.prototype.checkSession = function(session,defer){
    defer = defer || q.defer();
    if (!this.sessionsSinkName) {
      defer.reject(new lib.Error('NO_SESSIONS_SUPPORT'));
    } else {
      taskRegistry.run('findSink', {
        sinkname: this.sessionsSinkName,
        identity: {
          name: 'user',
          role: 'user',
          filter: {
            op: 'eq',
            field: 'session',
            value: session 
          }
        },
        onSink: this.onSessionCheckerSink.bind(this, session, defer)
      });
    }
    return defer.promise;
  };
  EntryPointService.prototype.processResolvedUser = function (userhash) {
    if(!userhash){
      return {userhash:null,session:null};
    }
    return this.produceSession(userhash);
  };
  EntryPointService.prototype.produceSession = function(userhash){
    var session = lib.uid(),
      identityobj = {userhash:userhash,session:session},
      d;
    if (this.sessionsWriterSink) {
      d = q.defer() ;
      this.sessionsWriterSink.call('create', {session:session, username: userhash.name}).done(
        d.resolve.bind(d,identityobj),
        d.reject.bind(d)
      );
      return d.promise;
    } else {
      return identityobj;
    }
  };
  EntryPointService.prototype.letMeIn = function(url,req,res){
    if(url && url.query && url.query.session){
      this.checkSession(url.query.session).done(
        this.doLetHimIn.bind(this, res),
        res.end.bind(res,'')
      );
      return;
    }
    this.extractRequestParams(url, req).then(
      this.authenticate.bind(this)
    ).then(
      this.processResolvedUser.bind(this)
    ).then(
      this.doLetHimIn.bind(this, res)
    ).catch(function(reason){
      res.end();
    });
  };
  EntryPointService.prototype.doLetHimIn = function (res, identityobj) {
    if(!identityobj.session){
      res.end();
      return;
    }
    //now, introduceSession to a __chosen__ target. __chosen__
    this.chooseTarget().done(
      this.onTargetChosen.bind(this,res,identityobj),
      res.end.bind(res,'')
    );
  };
  EntryPointService.prototype.letMeOut = function (url, req, res) {
    if(url && url.query && url.query.session){
      if (this.sessionsWriterSink) {
        console.log('calling sessionsWriterSink to delete', url.query.session);
        this.sessionsWriterSink.call('delete',{op:'eq',field:'session',value:url.query.session}).done(res.end.bind(res,'ok'));
      } else {
        if (this.destroyed) {
          lib.runNext(this.letMeOut.bind(this, url, req, res), 100);
        } else {
          res.end();
        }
      }
    } else {
      res.end();
    }
  };
  EntryPointService.prototype.register = function (url, req, res) {
    this.extractRequestParams(url, req).then(
      this.onRegisterParams.bind(this, res)
    ).catch(
      res.end.bind(res, '')
    );
  };
  EntryPointService.prototype.onRegisterParams = function (res, registerobj) {
    if(!this.remoteDBSink){
      res.end('service is currently down');
      return;
    }
    this.remoteDBSink.call('registerUser',registerobj).done(
      this.onRegisterSucceeded.bind(this, res, registerobj),
      this.onRegisterFailed.bind(this, res)
    );
  };
  EntryPointService.prototype.onRegisterSucceeded = function (res, registerobj, result) {
    this.authenticate(registerobj).then(
      this.processResolvedUser.bind(this)
    ).then(
      this.doLetHimIn.bind(this, res)
    ).catch(function(reason){
      res.end();
    });
  };
  EntryPointService.prototype.onRegisterFailed = function (res, result) {
    console.log('register nok', result);
    res.end();
  };
  EntryPointService.prototype.usernameExists = function (url, req, res) {
    this.extractRequestParams(url, req).then(
      this.onUserNameForCheck.bind(this, res)
    ).catch(
      res.end.bind(res, '')
    );
  };
  EntryPointService.prototype.onUserNameForCheck = function (res, usernameobj) {
    var username = usernameobj ? usernameobj.username : null;
    if(!username){
      res.end();
      return;
    }
    if(!this.remoteDBSink){
      res.end('service is currently down');
      return;
    }
    this.remoteDBSink.call('usernameExists',username).done(
      res.end.bind(res),
      res.end.bind(res,'false')
    );
  };
  EntryPointService.prototype.extractRequestParams = function(url, req, defer){
    defer = defer || q.defer();
    if (req.method==='GET') {
      defer.resolve(url.query);
      return defer.promise;
    }
    if (req.method==='PUT') {
      this.readRequestBody(req, defer);
      return defer.promise;
    }
    return defer.promise;
  };
  EntryPointService.prototype.readRequestBody = function (req, defer) {
    defer = defer || q.defer();
    var body = '';
    req.on('end', defer.resolve.bind(defer,body));
    req.on('error', defer.reject.bind(defer));
    req.on('data', function(chunk) {
      body += chunk;
    });
    return defer.promise;
  };
  EntryPointService.prototype.onSessionCheckerSink = function (session, defer, sessionsink) {
    var data = [];
    taskRegistry.run('materializeData', {
      sink: sessionsink,
      data: data,
      onInitiated: this.onSessionRead.bind(this, session, defer, sessionsink, data)
    });
  };
  EntryPointService.prototype.onSessionRead = function (session, defer, sessionsink, data) {
    var record = data[0];
    if (record) {
      //now get the User DB record from remoteDBSink and resolve the defer with that record data
      this.remoteDBSink.call('fetchUser', {
        username: record.username
      }).done(this.onUserFetched.bind(this, session, defer));
    } else {
      defer.reject(new lib.Error('SESSION_DOES_NOT_EXIST'));
    }
  };
  EntryPointService.prototype.onUserFetched = function (session, defer, userhash) {
    defer.resolve({userhash:userhash,session:session});
  };
  EntryPointService.prototype.onSessionsWriterSink = function (sessionswritersink) {
    this.sessionsWriterSink = sessionswritersink;
  };

  //target handling fun
  var _instancenameTargetPrefix = 'instancename:';
  EntryPointService.prototype.processTarget = function(target){
    if(target.indexOf(_instancenameTargetPrefix)===0){
      this.huntSingleTarget(target.substring(_instancenameTargetPrefix.length));
    }
  };
  EntryPointService.prototype.huntSingleTarget = function(sinkname){
    taskRegistry.run('findAndRun',{
      program: {
        sinkname:sinkname,
        identity:{name:'service',role:'service'},
        task:{
          name:this.onSingleTargetFound.bind(this,sinkname),
          propertyhash:{
            ipaddress: 'fill yourself',
            wsport: 'fill yourself'
          }
        }
      }
    });
  };
  EntryPointService.prototype.onSingleTargetFound = function(sinkname,sinkinfo){
    taskRegistry.run('natThis', {
      iaddress: sinkinfo.ipaddress,
      iport: sinkinfo.wsport,
      cb: this.onSingleTargetNatted.bind(this, sinkname, sinkinfo),
      singleshot: true
    });
  };
  EntryPointService.prototype.onSingleTargetNatted = function (sinkname, sinkinfo, eaddress, eport) {
    sinkinfo.ipaddress = eaddress;
    sinkinfo.wsport = eport;
    if(sinkinfo.sink){
      this.targets.add(sinkname,new TargetContainer(sinkname,sinkinfo));
    }else{
      var tc = this.targets.remove(sinkname);
      if(tc){
        tc.destroy();
      }
      this.huntSingleTarget(sinkname);
    }
  };
  function firstTargetChooser(targetobj,target,targetname){
    targetobj.target = target;
    targetobj.name = targetname;
    return true;
  };
  EntryPointService.prototype.chooseTarget = function(defer) {
    defer = defer || q.defer();
    var targetobj = {target:null,name:null};
    this.targets.traverseConditionally(firstTargetChooser.bind(null,targetobj));
    defer.resolve(targetobj);
    return defer.promise;
  };
  EntryPointService.prototype.onTargetChosen = function(res,identityobj,targetobj){
    if(!targetobj.target){
      res.end();
      return;
    }
    var ipaddress = targetobj.target.publicaddress || targetobj.target.address,
      port = targetobj.target.publicport || targetobj.target.port,
      session = identityobj.session;
    targetobj.target.sink.call('introduceSession',identityobj.session,identityobj.userhash).done(
      res.end.bind(res,JSON.stringify({
        ipaddress:ipaddress,
        port:port,
        session:session
      })),
      res.end.bind(res)
    );
  };
  EntryPointService.prototype.anonymousMethods = ['register', 'letMeInOnce'];
  
  return EntryPointService;
}

module.exports = createEntryPointService;
