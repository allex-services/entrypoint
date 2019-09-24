function testCycle () {
  it('Set a username and pass', function () {
    setGlobal('UserName1', lib.uid());
    setGlobal('Password1', lib.uid());
  });
  it('Unsuccessful Login', function () {
    return  expect(request('letMeIn', {__remote__username: UserName1, __remote__password: Password1})).to.eventually.be.empty;
  });
  it('ask for usernameExists should return false', function () {
    return expect(request('usernameExists', {username: UserName1})).to.eventually.include({
      username: UserName1,
      exists: false
    });
  });
  it('register', function () {
    return expect(request('register', {username: UserName1, password: Password1, role:'generichumanuserdata'})).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('ask for usernameExists should return true', function () {
    setGlobal('RegistrationReply', Requester.lastReply); //will need this to letMeOut later
    return expect(request('usernameExists', {username: UserName1})).to.eventually.include({
      username: UserName1,
      exists: true
    });
  });
  it('letMeOut with the registration sessionid', function () {
    return expect(request('letMeOut', {__sessions__id: RegistrationReply.session})).to.eventually.equal('ok');
  });
  it('Unsuccessful Login with the wrong password', function () {
    return  expect(request('letMeIn', {__remote__username: UserName1, __remote__password: lib.uid()})).to.eventually.be.empty;
  });
  it('Successful Login after register', function () {
    return expect(request('letMeIn', {__remote__username: UserName1, __remote__password: Password1})).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('letMeOut with the login sessionid', function () {
    return expect(request('letMeOut', {__sessions__id: Requester.lastReply.session})).to.eventually.equal('ok');
  });
  loadMochaIntegration('allex_masterservice');
  it('find EntryPoint', function () {
    return setGlobal('EntryPoint', findSink('EntryPoint'));
  });
  it('announce existing User - no password change', function () {
    return expect(
      setGlobal('announceKnownUserResult', EntryPoint.call('announceUser', {username: UserName1, password: 'blah', role:'generichumanuserdata'}, false, true))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('login as announced', function () {
    return expect(
      setGlobal('letMeInOnAnnouncedResult', request('letMeInWithSession', {__sessions__id: announceKnownUserResult.session}))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('letMeOut with the announced sessionid', function () {
    return expect(request('letMeOut', {__sessions__id: announceKnownUserResult.session})).to.eventually.equal('ok');
  });
  it('announce non-existing User but not force register', function () {
    return expect(
      EntryPoint.call('announceUser', {username: lib.uid(), password: 'blah', role:'generichumanuserdata'}, false, true)
    ).to.eventually.be.rejected;
  });
  it('announce non-existing User but force register', function () {
    return expect(
      setGlobal('announceKnownUserResult', EntryPoint.call('announceUser', {username: lib.uid(), password: 'blah', role:'generichumanuserdata'}, true, true))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('login as announced', function () {
    return expect(
      setGlobal('letMeInOnAnnouncedResult', request('letMeInWithSession', {__sessions__id: announceKnownUserResult.session}))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('letMeOut with the announced sessionid', function () {
    return expect(request('letMeOut', {__sessions__id: announceKnownUserResult.session})).to.eventually.equal('ok');
  });
  it('announce existing User - with password change', function () {
    return expect(
      setGlobal('announceKnownUserResult', EntryPoint.call('announceUser', {username: UserName1, password: lib.uid(), role:'generichumanuserdata'}, false, false))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('login as announced', function () {
    return expect(
      setGlobal('letMeInOnAnnouncedResult', request('letMeInWithSession', {__sessions__id: announceKnownUserResult.session}))
    ).to.eventually.have.all.keys('ipaddress', 'port', 'session');
  });
  it('letMeOut with the announced sessionid', function () {
    return expect(request('letMeOut', {__sessions__id: announceKnownUserResult.session})).to.eventually.equal('ok');
  });
  /*
  */
  it('Destroy EntryPoint sink', function () {
    EntryPoint.destroy();
  });
}

describe ('Basic Tests', function () {
  loadMochaIntegration('allex_httpservice');
  it('prepare the request function', function () {
    setGlobal('Requester', new HTTPRequester('http', '127.0.0.1', 11320, 'GET', {debug: false}));
    setGlobal('request', Requester.request.bind(Requester));
  });
  for (var i=0; i<500; i++) {
    testCycle();
  }
});
