function createFBPhoneStrategy (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;


  function FBPhoneAuthJob (defer, strategy, credentials) {
    JobBase.call(this,defer);
    this.strategy = strategy;
    this.credentials = credentials;
    this.go();
  }
  lib.inherit(FBPhoneAuthJob, JobBase);
  FBPhoneAuthJob.prototype.destroy = function () {
    this.credentials = null;
    this.strategy = null;
    JobBase.prototype.destroy.call(this);
  };
  FBPhoneAuthJob.prototype.go = function () {
    //no csrf checking
    if (!this.credentials.code) {
      lib.runNext(this.reject.bind(this));
      return;
    }
    var app_access_token = ['AA', this.strategy.app_id, this.strategy.app_secret].join('|');
    var params = {
      grant_type: 'authorization_code',
      code: this.credentials.code,
      access_token: app_access_token
    };


    lib.request(this.strategy.token_exchange_base_url, {
      parameters: params, 
      onComplete: this.onTokenExchangeSuccess.bind(this),
      onError: this.reject.bind(this)
    });
  };

  FBPhoneAuthJob.prototype.onTokenExchangeSuccess = function (response) {
      // get account details at /me endpoint
      var data;
      if (!(response && response.data)) {
        this.reject(new lib.Error('INVALID_RESPONSE_FROM_FB_ACCOUNT_KIT_EXCHANGE_TOKEN'));
        return;
      }
      //TODO switch (response.code....)
      try{
        data = JSON.parse(response.data);
      }catch(e){
        this.reject(new lib.Error('BAD_RESPONSE_DATA_FORMAT'));
      }
      lib.request(this.strategy.me_endpoint_base_url, {
        parameters: {
          access_token: data.access_token
        },
        onComplete: this.onMeSuccess.bind(this),
        onError: this.reject.bind(this)
      });
  };

  FBPhoneAuthJob.prototype.onMeSuccess = function () {
    console.log('nacinje li ga striko?', arguments);
    //TODO switch (response.code....)
  };
  

  function FBPhoneStrategy (prophash) {
    this.ak_api_version = prophash.ak_api_version;
    this.app_id = prophash.app_id;
    this.app_secret = prophash.app_secret;
    this.base_url = prophash.base_url;
    this.me_endpoint_base_url = prophash.base_url + this.ak_api_version + prophash.me_endpoint_sufix;
    this.token_exchange_base_url = prophash.base_url + this.ak_api_version + prophash.token_exchange_sufix;
  }
  FBPhoneStrategy.prototype.destroy = function () {
    this.token_exchange_base_url = null;
    this.me_endpoint_base_url = null;
    this.base_url = null;
    this.app_secret = null;
    this.app_id = null;
    this.ak_api_version = null;
  };
  FBPhoneStrategy.prototype.resolveUser = function (credentials,defer) {
    //credentials may be any object, with some compulsory properties
    //fbpho
    //credentials.code, credentials.csrf (currenty not checking)
    console.log('oli FBPhoneAuthJob radit stogod?', credentials, defer);
    if (!credentials) {
      defer.resolve(null);
    }
    if (!credentials.fbphone) {
      defer.resolve(null);
    }
    var j = new FBPhoneAuthJob(defer, this, credentials);
    return j.defer.promise;
  };

  return FBPhoneStrategy;
}

module.exports = createFBPhoneStrategy;
