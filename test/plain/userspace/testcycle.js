//allexrun
var execlib, lib, q, qlib;
var entrypointport = 11320;

function onData (defer, buffer) {
  var str = buffer.toString();
  try {
    str = JSON.parse(str);
  }
  catch (e) {
    //console.error(e);
  }
  defer.resolve(str);
  defer = null;
}

function request (command, parameters) {
  var d = q.defer(), ret = d.promise, url;
  url = 'http://127.0.0.1:'+entrypointport+'/'+command;
  console.log('url', url, '=>', parameters);
  lib.request(url, {
    method: 'GET',
    parameters: parameters,
    onData: onData.bind(null, d),
    onError: d.reject.bind(d)
  });
  return qlib.promise2console(ret, 'request for '+command);
}


function go2 () {
  var newuser = lib.uid();
  request('letMeIn', {__remote__username: 'user1', __remote__password: '123456'}).then(
    request.bind(null, 'register', {username: newuser, password: '123456', role: 'generichumanuserdata'})
  ).then(
    (loginobj) => {
      return request('letMeOut', {__sessions__id: loginobj.session});
    }
  ).then(
    request.bind(null, 'letMeIn', {__remote__username: newuser, __remote__password: '123456'})
  ).then(
    (loginobj) => {
      return request('letMeInWithSession', {__sessions__id: loginobj.session});
    }
  ).then(
    (loginobj) => {
      return request('letMeOut', {__sessions__id: loginobj.session});
    }
  );
}

module.exports = function go (_execlib) {
  execlib = _execlib;
  lib = execlib.lib;
  q = lib.q;
  qlib = lib.qlib;
  return execlib.loadDependencies('client', [], go2);
};
