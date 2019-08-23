// allexenterandrun

function go (taskobj) {
  console.log('got sink', !!taskobj.sink);
  process.exit(0);
}

module.exports = {
  sinkname: "EntryPoint",
  identity: {
    __remote__username: 'user1',
    __remote__password: '123456'
  },
  cb: go
};
