var Url = require('url');

function createEntryPointService(execlib, ParentServicePack) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    ParentService = ParentServicePack.Service,
    qlib = lib.qlib,
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
    this.sessionsDBSinkFinder = null;
    if (this.sessionsSinkName) {
      this.sessionsDBSinkFinder = taskRegistry.run('findSink', {
        sinkname: this.sessionsSinkName,
        identity: {
          name: 'user',
          role: 'user',
        },
        onSink: this.onSessionsSink.bind(this)
      });
    }
    this.processTarget(prophash.target);
  }
  ParentService.inherit(EntryPointService,factoryCreator);
  EntryPointService.prototype.__cleanUp = function () {
    if (this.sessionsDBSinkFinder) {
      this.sessionsDBSinkFinder.destroy();
    }
    this.sessionsDBSinkFinder = null;
    var sw = this.state.get('sessions');
    if (sw) {
      this.state.remove('sessions');
      sw.destroy();
    }
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
  EntryPointService.prototype.isInitiallyReady = function () {
    return false;
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
    if (!this.authenticator) {
      console.error('no authsink');
      process.exit(0);
    }
    this.readyToAcceptUsersDefer.resolve(true);
  };
  EntryPointService.prototype.onRemoteDBSink = function (remotedbsink) {
    if(!this.destroyed){
      remotedbsink.destroy();
      return;
    }
    this.remoteDBSink = remotedbsink;
  };
  EntryPointService.prototype.checkSession = function(session){
    if (!this.sessionsSinkName) {
      return q.reject(new lib.Error('NO_SESSIONS_SUPPORT'));
    } else {
      return this.getSession(session).then(
        this.onSessionRead.bind(this, session)
      );
    }
    return defer.promise;
  };
  EntryPointService.prototype.getSession = execSuite.dependentServiceMethod([], ['sessions'], function (sessions, session, defer) {
    //console.log('getSession from', sessions.role);
    /*
    sessions.call('findSession', session).then(
      defer.resolve.bind(defer),
      this.onSessionNotFound.bind(this, session, defer)
    );
    */
    taskRegistry.run('readFromDataSink', {
      sink: sessions,
      filter: {
        op: 'eq',
        field: 'session',
        value: session
      },
      singleshot: true,
      cb: defer.resolve.bind(defer),
      errorcb: this.onSessionNotFound.bind(this, session, defer)
    });
  });
  EntryPointService.prototype.onSessionNotFound = function (session, defer) {
    return qlib.promise2defer(this.getSessionFromRealSession(session), defer);
  };
  EntryPointService.prototype.getSessionFromRealSession = execSuite.dependentServiceMethod([], ['sessions'], function (sessions, session, defer) {
    console.log('getSessionFromRealSession', session, defer);
    try {
    taskRegistry.run('readFromDataSink',{
      sink:sessions,
      filter: {
        op: 'eq',
        field: 'session',
        value: session
      },
      singleshot: true,
      //cb: defer.resolve.bind(defer)
      cb: function (result) {
        console.log('getSessionFromRealSession', session, defer, result);
        defer.resolve(result);
      }
    });
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  });
  EntryPointService.prototype.processResolvedUser = function (userhash) {
    if(!userhash){
      return q({userhash:null,session:null});
    }
    return this.produceSession(userhash);
  };
  EntryPointService.prototype.produceSession = function(userhash){
    var session = lib.uid(),
      identityobj = {userhash:userhash,session:session},
      sw = this.state.get('sessions'),
      d;
    if (sw) {
      d = q.defer() ;
      sw.call('create', {session:session, username: userhash.name}).done(
        d.resolve.bind(d,identityobj),
        d.reject.bind(d)
      );
      return d.promise;
    } else {
      return q(identityobj);
    }
  };
  EntryPointService.prototype.letMeIn = function(url,req,res){
    if(url && url.query && url.query.session){
      this.checkSession(url.query.session)
      .then(null,console.log.bind(console, 'checkSession failed'))
      .done(
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
    if(!(identityobj && identityobj.session)){
      res.end();
      return;
    }

    //now, introduceSession to a __chosen__ target. __chosen__
    this.chooseTarget()
    .then(null, console.log.bind(console, 'chooseTarget failed'))
    .done(
      this.onTargetChosen.bind(this,res,identityobj),
      res.end.bind(res,'')
    );
  };
  EntryPointService.prototype.letMeOut = function (url, req, res) {
    if(url && url.query && url.query.session){
      this.checkSession(url.query.session)
      .then(
        this.deleteSession.bind(this, url.query.session)
      )
      .then(
        this.onSessionDeleted.bind(this, res)
      )
      .fail(
        res.end.bind(res, '')
      );
    } else {
      console.log('no session', url.query.session);
      res.end('');
    }
  };
  EntryPointService.prototype.deleteSession = function (session, userhash, defer) {
    defer = defer || q.defer();
    var sw = this.state.get('sessions');
    if (sw) {
      sw.call('delete',{op:'eq',field:'session',value:session})
      .then(
        defer.resolve.bind(defer, userhash),
        defer.reject.bind(defer),
        defer.notify.bind(defer)
      );
    } else {
      if (this.destroyed) {
        if (this.sessionsSinkName) {
          lib.runNext(this.deleteSession.bind(this, session, userhash, defer), 100);
        } else {
          defer.reject(new lib.Error('NO_SESSION_SUPPORT'));
        }
      } else {
        defer.reject(new lib.Error('SERVICE_ALREADY_DESTROYED'));
      }
    }
    return defer.promise;
  };
  EntryPointService.prototype.onSessionDeleted = function (res, userhash) {
    //res.end.bind(res,'ok');
    return this.chooseTarget()
    .then(
      this.onTargetChosenForLogout.bind(this, res, userhash)
    );
  };
  EntryPointService.prototype.onTargetChosenForLogout = function (res, userhash, targetobj) {
    try {
    if(!targetobj.target){
      console.log('onTargetChosen, but no target?', targetobj);
      res.end(JSON.stringify({error:'NO_TARGETS_YET'}));
      return;
    }
    console.log('should logout', userhash);
    targetobj.target.sink.call('logout', userhash.userhash.profile.username)
    .done(
      res.end.bind(res,'ok'),
      res.end.bind(res, '')
    );
    } catch(e) {
      console.error(e.stack);
      console.error(e);
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
    //console.log('register nok', result);
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
  EntryPointService.prototype.onSessionRead = function (session, record) {
    if (record) {
      //now get the User DB record from remoteDBSink and resolve the defer with that record data
      return this.remoteDBSink.call('fetchUser', {
        username: record.username
      }).then(this.onUserFetched.bind(this, session));
    } else {
      return q.reject(new lib.Error('SESSION_DOES_NOT_EXIST'));
    }
  };
  EntryPointService.prototype.onUserFetched = function (session, userhash) {
    return q({userhash:userhash,session:session});
  };
  EntryPointService.prototype.onSessionsSink = function (sessionssink) {
    if (sessionssink) {
      this.state.set('sessions', sessionssink);
    } else {
      this.state.remove('sessions');
    }
  };

  //target handling fun
  var _instancenameTargetPrefix = 'instancename:';
  EntryPointService.prototype.processTarget = function(target){
    if(target.indexOf(_instancenameTargetPrefix)===0){
      this.huntSingleTarget(target.substring(_instancenameTargetPrefix.length));
    }
  };
  EntryPointService.prototype.huntSingleTarget = function(sinkname){
    console.log('SHOULD HUNT FOR SINGLE TARGET', sinkname);
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
    //console.log('going to nat',sinkinfo.ipaddress,':',sinkinfo.wsport);
    taskRegistry.run('natThis', {
      iaddress: sinkinfo.ipaddress,
      iport: sinkinfo.wsport,
      cb: this.onSingleTargetNatted.bind(this, sinkname, sinkinfo),
      singleshot: true
    });
  };
  EntryPointService.prototype.onTargetContainerDown = function (sinkname) {
    if (!this.targets) {
      return;
    }
    this.targets.remove(sinkname);
    this.huntSingleTarget(sinkname);
  };
  EntryPointService.prototype.onSingleTargetNatted = function (sinkname, sinkinfo, eaddress, eport) {
    //console.log('natted',sinkinfo.ipaddress,':',sinkinfo.wsport,'=>',eaddress,eport);
    try {
    var tc;
    sinkinfo.ipaddress = eaddress;
    sinkinfo.wsport = eport;
    if(sinkinfo.sink){
      tc = new TargetContainer(sinkname,sinkinfo);
      tc.destroyed.attach(this.onTargetContainerDown.bind(this, sinkname));
      this.targets.add(sinkname,tc);
    }else{
      var tc = this.targets.remove(sinkname);
      if(tc){
        tc.destroy();
      }
      this.huntSingleTarget(sinkname);
    }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
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
      console.log('onTargetChosen, but no target?', targetobj);
      res.end(JSON.stringify({error:'NO_TARGETS_YET'}));
      return;
    }
    var ipaddress = targetobj.target.publicaddress || targetobj.target.address,
      port = targetobj.target.publicport || targetobj.target.port,
      session = identityobj.session;


    targetobj.target.sink.call('introduceSession',identityobj.session,identityobj.userhash)
    .then(null, console.log.bind(console, 'introduceSession failed'))
    .done(
      res.end.bind(res,JSON.stringify({
        ipaddress:ipaddress,
        port:port,
        session:session
      })),
      res.end.bind(res, '')
    );
  };
  EntryPointService.prototype.anonymousMethods = ['register', 'letMeInOnce'];
  
  return EntryPointService;
}

module.exports = createEntryPointService;
