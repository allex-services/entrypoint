function reporter (taskobj, defer, result) {
  taskobj.task.destroy();
  defer.resolve(result.sink);
  defer = null;
}

function letMeInOnAddressAndPort (address, port, identity) {
  var taskobj = {task: null},
    d = q.defer(),
    ret = d.promise;

  taskobj.task = taskRegistry.run('letMeInOnAddressAndPort', {
    ipaddress: address,
    port: port,
    identity: identity,
    cb: reporter.bind(null, taskobj, d)
  });
  taskobj = null;
  d = null;
  return ret;
}

setGlobal('letMeInOnAddressAndPort', letMeInOnAddressAndPort);
