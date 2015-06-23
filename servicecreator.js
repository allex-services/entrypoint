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
    this.authenticator = null;
    this.targets = new lib.Map();
    execSuite.acquireAuthSink(prophash.strategies).done(
      this.onAuthenticator.bind(this),
      this.close.bind(this)
    );
    this.strategynames = Object.keys(prophash.strategies);
    this.processTarget(prophash.target);
  }
  ParentService.inherit(EntryPointService,factoryCreator);
  EntryPointService.prototype.__cleanUp = function () {
    this.strategynames = null;
    if(!this.targets){
      return;
    }
    if(this.authenticator){
      this.authenticator.destroy();
    }
    this.authenticator = null;
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
    var credentials,
      url = Url.parse(req.url,true),
      query = url.query,
      session = query ? query.session : null,
      mymethod = this[url.pathname.substring(1)],
      preparedmethod;
    if('function' !== typeof mymethod){
      res.end();
      return;
    }
    //mymethod has to accept (url,req,res,identityobj),
    //identityobj = {userhash:userhash,session:session}
    if(mymethod.length!==4){
      res.end('My method length '+mymethod.length+' is not 4');
      return;
    }
    preparedmethod = mymethod.bind(this,url,req,res);
    if(session){
      var d = q.defer();
      this.checkSession(session,d);
      d.promise.done(
        preparedmethod,
        res.end.bind(res)
      );
      return;
    }
    if(req.method==='GET'){
      this.authenticate(query).done(
        this.onUserResolved.bind(this,preparedmethod),
        res.end.bind(res)
      );
      return;
    }
    res.end("tiddle-dee-dum");
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
  var _instancenameTargetPrefix = 'instancename:';
  EntryPointService.prototype.processTarget = function(target){
    if(target.indexOf(_instancenameTargetPrefix)===0){
      this.huntSingleTarget(target.substring(_instancenameTargetPrefix.length));
    }
  };
  EntryPointService.prototype.huntSingleTarget = function(sinkname){
    console.log('findAndRun!',sinkname);
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
    console.log('single target found',sinkinfo);
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
  EntryPointService.prototype.checkSession = function(session,defer){
    defer.resolve({userhash:{name:'user',role:'user'},session:session});
  };
  EntryPointService.prototype.onUserResolved = function(preparedmethod,userhash){
    if(!userhash){
      preparedmethod({userhash:null,session:null});
      return;
    }
    var d = q.defer();
    this.produceSession(userhash,d);
    d.promise.done(
      preparedmethod,
      function(reason){
        console.error(reason);
        preparedmethod({userhash:null,session:null});
      }
    );
  };
  EntryPointService.prototype.produceSession = function(userhash,defer){
    defer.resolve({userhash:userhash,session:lib.uid()});
  };
  function firstTargetChooser(targetobj,target,targetname){
    targetobj.target = target;
    targetobj.name = targetname;
    return true;
  };
  EntryPointService.prototype.chooseTarget = function(defer) {
    var targetobj = {target:null,name:null};
    this.targets.traverseConditionally(firstTargetChooser.bind(null,targetobj));
    defer.resolve(targetobj);
  };
  EntryPointService.prototype.onTargetChosen = function(req,res,identityobj,targetobj){
    if(!targetobj.target){
      res.end();
      return;
    }
    var ipaddress = targetobj.target.publicaddress || targetobj.target.address,
      port = targetobj.target.publicport || targetobj.target.port,
      session = identityobj.session;
    targetobj.target.sink.call('introduceSession',identityobj.session,identityobj.userhash).done(
      function(){
        res.end(JSON.stringify({
          ipaddress:ipaddress,
          port:port,
          session:session
        }));
      },
      res.end.bind(res)
    );
  };
  EntryPointService.prototype.letMeIn = function(url,req,res,identityobj){
    console.log('letMeIn with',this.targets.count,'targets');
    if(!identityobj.session){
      res.end();
      return;
    }
    //now, introduceSession to a __chosen__ target. __chosen__
    var d = q.defer();
    this.chooseTarget(d);
    d.promise.done(
      this.onTargetChosen.bind(this,req,res,identityobj),
      res.end.bind(res)
    );
  };
  
  return EntryPointService;
}

module.exports = createEntryPointService;
