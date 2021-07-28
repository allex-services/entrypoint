function createEntryPointService(execlib, ParentService, AuthenticationService, AllexResponse, remoteauthmixinslib, sessionsauthmixinslib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    qlib = lib.qlib,
    RemoteServiceListenerServiceMixin = execSuite.RemoteServiceListenerServiceMixin,
    TargetContainer = require('./targetcontainercreator')(execlib),
    ClusterRepresentativeHunter = require('./clusterrepresentativehuntercreator')(execlib),
    FBPhoneStrategy = require('./fbstrategycreator')(execlib),
    RemoteStrategyServiceMixin = remoteauthmixinslib.service,
    SessionsStrategyServiceMixin = sessionsauthmixinslib.service;

  AuthenticationService.prototype.strategyCtors.add('fb', FBPhoneStrategy);

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user'), AllexResponse) 
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
    SessionsStrategyServiceMixin.makeupPropertyHash(prophash);
    ParentService.call(this, prophash);
    RemoteServiceListenerServiceMixin.call(this);
    RemoteStrategyServiceMixin.call(this, prophash);
    SessionsStrategyServiceMixin.call(this, prophash);
    this.state.set('port',this.port);
    this.guardedMethods = {
      letMeIn: 'remote',
      letMeInWithSession: 'sessions',
      letMeOut: 'sessions'
    };
    this.targets = new lib.Map();
    this.secondFactorAuthModules = prophash.secondfactorauthmodules;
    this.secondFactorAuthenticators = new lib.Map();
    this.processTarget(prophash.target);
  }
  ParentService.inherit(EntryPointService,factoryCreator);
  RemoteServiceListenerServiceMixin.addMethods(EntryPointService);
  RemoteStrategyServiceMixin.addMethods(EntryPointService);
  SessionsStrategyServiceMixin.addMethods(EntryPointService);
  EntryPointService.prototype.__cleanUp = function () {
    if (this.secondFactorAuthenticators) {
      lib.arryDestroyAll(this.secondFactorAuthenticators);
      this.secondFactorAuthenticators.destroy();
    }
    this.secondFactorAuthenticators = null;
    this.secondFactorAuthModules = null;
    if(!this.targets){
      return;
    }
    lib.containerDestroyAll(this.targets);
    this.targets.destroy();
    this.targets = null;
    this.port = null;
    SessionsStrategyServiceMixin.prototype.destroy.call(this);
    RemoteStrategyServiceMixin.prototype.destroy.call(this);
    RemoteServiceListenerServiceMixin.prototype.destroy.call(this);
    ParentService.prototype.__cleanUp.call(this);
  };
  EntryPointService.prototype.isInitiallyReady = function () {
    return false;
  };
  EntryPointService.prototype.acquirePort = function(defer){
    console.log('MY PORT',this.port);
    defer.resolve(this.port);
  };
  EntryPointService.prototype.onAuthenticator = function (authsink) {
    ParentService.prototype.onAuthenticator.call(this, authsink);
    this.loadSecondFactorAuthModules();
  };
  EntryPointService.prototype.processResolvedUser = function (userhash) {
    var secondphaseauth;
    if(!userhash){
      return q({userhash:null,session:null});
    }
    if (this.state.get('sessions') && userhash.profile && userhash.profile['secondphaseauth']) {
      secondphaseauth = this.secondFactorAuthenticators.get(userhash.profile['secondphaseauth']);
      if (secondphaseauth) {
        return secondphaseauth.generateToken(userhash.profile).then(this.onSecondPhaseToken.bind(this, userhash));
      }
    }
    return this.produceAuthSession(userhash);
  };
  EntryPointService.prototype.letMeIn = function(url,req,res){
    if (!(url && url.auth)) {
      res.end('{}');
      return;
    }
    this.processResolvedUser(url.auth).then(
      this.doLetHimIn.bind(this, res)
    ).catch(
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.letUserHashIn = function (res, userhash) {
    this.authenticate({remote:userhash}).then(
      this.processResolvedUser.bind(this)
    ).then(
      this.doLetHimIn.bind(this, res)
    ).catch(
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.doLetHimIn = function (res, identityobj) {
    if(!(identityobj && identityobj.session)){
      res.end('{}');
      return;
    }

    if (identityobj.secondphase === true) {
      res.end(JSON.stringify({
        secondphase: identityobj.session
      }));
      return;
    }

    //now, introduceSession to a __chosen__ target. __chosen__
    this.chooseTarget()
    .done(
      this.onTargetChosen.bind(this,res,identityobj),
      this.resEnder(res, '{}')
    );
    return;
  };
  EntryPointService.prototype.letMeInWithSession = function(url,req,res){
    if (!(url && url.auth)) {
      res.end('{}');
      return;
    }
    this.onSessionMaybeChecked(url.auth.session, url.alreadyprocessed.secondphasetoken, url.auth)
    .done(
      this.doLetHimIn.bind(this, res),
      function (error) {
        res.end( JSON.stringify(
          error && error.code ?
            {error:error.code}:
            {}
        ));
        res = null;
      }
    );
  };
  EntryPointService.prototype.letMeOut = function (url, req, res) {
    if(url && url.auth && url.auth.session){
      this.deleteAuthSession(url.auth.session, url.auth)
      .then(
        this.onSessionDeleted.bind(this, res)
      )
      .fail(
        this.resEnder(res, '{}')
      );
    } else {
      console.log('no session', url.query.session);
      res.end('{}');
    }
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
    if(!(userhash && userhash.userhash && userhash.userhash.profile && userhash.userhash.profile.username)){
      res.end('ok');
      return;
    }
    targetobj.target.sink.call('logout', userhash.userhash.profile.username)
    .done(
      this.resEnder(res, 'ok'),
      this.resEnder(res, '{}')
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
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.onRegisterParams = function (res, registerobj) {
    this.registerRemoteUser(registerobj).then(
      this.onRegisterSucceeded.bind(this, res, registerobj),
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.onRegisterSucceeded = function (res, registerobj, result) {
    this.authenticate({remote:registerobj}).then(
      this.processResolvedUser.bind(this)
    ).then(
      this.doLetHimIn.bind(this, res)
    ).catch(
      this.resEnder.bind(this, res, '{}')
    );
  };
  EntryPointService.prototype.usernameExists = function (url, req, res) {
    this.extractRequestParams(url, req).then(
      this.onUserNameForCheck.bind(this, res)
    ).catch(
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.onUserNameForCheck = function (res, usernameobj) {
    var username = usernameobj ? usernameobj.username : null;
    if(!username){
      res.end('{}');
      return;
    }
    this.checkUsernameExistence(username).then(
      (ueresult) => {
        res.end(JSON.stringify({
          username: username,
          exists: ueresult
        }));
        res = null;
        username = null;
      },
      this.resEnder(res, '{}')
    );
  };
  EntryPointService.prototype.onSessionMaybeChecked = function (session, token, record) {
    var spc;
    if (record) {
      //now get the User DB record from remote authentication and resolve the defer with that record data
      spc = this.checkForSecondPhaseUserName(record.username);
      if (spc && 'object' === typeof spc && 'username' in spc && 'token' in spc) {
        if (token != spc.token) {
          //console.error('token', token, '!== db token', spc.token);
          return q.reject(new lib.Error('SECONDPHASE_TOKEN_MISMATCH'));
        }
        record.username = spc.username;
        return this.deleteAuthSession(session, record).then(
          this.fetchUserFromSessionRecord.bind(this, session)
        );
      }
      return this.fetchUserFromSessionRecord(session, record);
    } else {
      return q.reject(new lib.Error('SESSION_DOES_NOT_EXIST', session));
    }
  };
  EntryPointService.prototype.fetchUserFromSessionRecord = function (session, record) {
    return this.fetchRemoteUser(record.username).then(this.onUserFetched.bind(this, session));
  };
  EntryPointService.prototype.onUserFetched = function (session, userhash) {
    return q({userhash:userhash,session:session});
  };

  //target handling fun
  var _instancenameTargetPrefix = 'instancename:';
  var _clusterRepresentativePrefix = 'clusterrepresentative:';
  EntryPointService.prototype.processTarget = function(target){
    if(target.indexOf(_instancenameTargetPrefix)===0){
      this.huntSingleTarget(target.substring(_instancenameTargetPrefix.length));
    }
    if(target.indexOf(_clusterRepresentativePrefix)===0){
      this.huntClusterRepresentative(target.substring(_clusterRepresentativePrefix.length));
    }
  };
  EntryPointService.prototype.huntSingleTarget = function(sinkname){
    var jsonsinkname;
    try {
      jsonsinkname = JSON.parse(sinkname);
      sinkname = jsonsinkname;
    } catch (ignore) { }
    console.log('SHOULD HUNT FOR SINGLE TARGET', sinkname);
    taskRegistry.run('findAndRun',{
      program: {
        sinkname:sinkname,
        identity:{name:'service',role:'service'},
        task:{
          name:this.onSingleTargetFound.bind(this,sinkname),
          propertyhash:{
            ipaddress: 'fill yourself',
            httpport: 'fill yourself'
          }
        }
      }
    });
  };
  EntryPointService.prototype.onSingleTargetFound = function(sinkname,sinkinfo){
    //console.log('going to nat',sinkinfo.ipaddress,':',sinkinfo.httpport);
    taskRegistry.run('natThis', {
      iaddress: sinkinfo.ipaddress,
      iport: sinkinfo.httpport,
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
    //console.log('natted',sinkinfo.ipaddress,':',sinkinfo.httpport,'=>',eaddress,eport);
    var tc;
    sinkinfo.ipaddress = eaddress;
    sinkinfo.httpport = eport;
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
  };
  EntryPointService.prototype.huntClusterRepresentative = function (clusterrepresentativearrayjson) {
    //console.log('clusterrepresentativearray', clusterrepresentativearray);
    var clusterrepresentativeid, clusterrepresentativearray, sinkname, hunter;
    try {
      clusterrepresentativearray = JSON.parse(clusterrepresentativearrayjson);
    } catch (e) {
      throw new lib.Error('CLUSTER_REPRESENTATIVE_MUST_BE_A_JSON_ARRAY', 'clusterrepresentativearray must be a JSON stringified Array');
    }
    if (!lib.isArray(clusterrepresentativearray)) {
      throw new lib.Error('CLUSTER_REPRESENTATIVE_NOT_AN_ARRAY', 'clusterrepresentative must be an Array');
    }
    if (clusterrepresentativearray.length !== 2) {
      throw new lib.Error('CLUSTER_REPRESENTATIVE_MUST_HAVE_TWO_ELEMENTS', 'clusterrepresentative must have 2 elements: Clusters name and gateway name');
    }
    clusterrepresentativeid = clusterrepresentativearray.join('|');
    sinkname = [
      {name: clusterrepresentativearray[0], identity: {name: 'monitor', role: 'monitor'}},
      clusterrepresentativearray[1]];
    hunter = this.targets.get(clusterrepresentativeid);
    if (!hunter) {
      hunter = new ClusterRepresentativeHunter(sinkname);
      this.targets.add(clusterrepresentativeid, hunter);
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
    if(!(targetobj.target && targetobj.target.sink)){
      console.log('onTargetChosen, but no target?', targetobj);
      res.end(JSON.stringify({error:'NO_TARGETS_YET'}));
      return;
    }
    var ipaddress = targetobj.target.publicaddress || targetobj.target.address,
      port = targetobj.target.publicport || targetobj.target.port,
      session = identityobj.session;

    targetobj.target.sink.call('introduceSession',identityobj.session,identityobj.userhash)
    .done(
      this.onTargetSessionIntroduced.bind(this, ipaddress, port, session, res),
      res.end.bind(res, '{}')
    );
  };
  EntryPointService.prototype.onTargetSessionIntroduced = function (ipaddress, port, session, res, response) {
    var ret;
    if (response && response.hasOwnProperty && response.hasOwnProperty('ipaddress') && response.hasOwnProperty('port')){
      ret = {
        ipaddress: response.ipaddress,
        port: response.port,
        session: session
      };
    } else if (response === session) {
      ret = {
        ipaddress:ipaddress,
        port:port,
        session:session
      };
    } else {
      ret = {error:'NO_TARGETS_YET'};
    }
    res.end(JSON.stringify(ret));
  };
  EntryPointService.prototype.anonymousMethods.push('register', 'usernameExists');
  require('./secondfactorauthextension')(execlib, EntryPointService);
  
  return EntryPointService;
}

module.exports = createEntryPointService;
