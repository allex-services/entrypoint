var _EntryPointAddress = '127.0.0.1',
  _EntryPointPort = 11320;


function ensureUserOnEntryPoint (requestername, username) {
  it('Ask for user "'+username+'"', function () {
    this.timeout(1e5);
    return setGlobal('blahExists', getGlobal(requestername).request('usernameExists', {username: username}).then(qlib.resultpropertyreturner('exists')));
  });
  it('If not registered, register', function () {
    this.timeout(1e5);
    if (!blahExists) {
      return getGlobal(requestername).request('register', {username: username, password: '123456', role: 'user'});
    }
  });
  it('Assure that user "'+username+'" exists now', function () {
    this.timeout(1e5);
    return expect(getGlobal(requestername).request('usernameExists', {username: username}).then(qlib.resultpropertyreturner('exists'))).to.eventually.equal(true);
  });
	it('Clear', function () {
		username = null;
  });
}
function getOneUserViaEntryPoint (requestername, usersinkname, username) {
	username = username || lib.uid();
  ensureUserOnEntryPoint(requestername, username);
  it('Let Me In', function () {
    this.timeout(1e5);
    return setGlobal(usersinkname, letMeIn(null, {__remote__username: username, __remote__password: '123456'}));
  });
	it('Clear', function () {
		username = null;
  });
}
function getOneUser (requestername, usersinkname, username) {
	username = username || lib.uid();
  ensureUserOnEntryPoint(requestername, username);
  it('Let Me In', function () {
    this.timeout(1e5);
    return setGlobal(usersinkname, letMeInOnAddressAndPort(_EntryPointAddress, _EntryPointPort, {__remote__username: username, __remote__password: '123456'}));
  });
	it('Clear', function () {
		username = null;
  });
}

describe('Test Tasks', function () {
  loadMochaIntegration('allex_httpservice');
  loadMochaIntegration('allex_entrypointservice');
  it('Create Requester', function () {
    return setGlobal('Requester', new HTTPRequester('http', _EntryPointAddress, _EntryPointPort, 'GET', {debug:true}));
  });
	getOneUserViaEntryPoint('Requester', 'User');
  it('Destroy', function () {
    User.destroy();
  });
	getOneUser('Requester', 'User');
  it('Wut?', function () {
    console.log(User);
  });
  it('Destroy', function () {
    User.destroy();
  });
});
