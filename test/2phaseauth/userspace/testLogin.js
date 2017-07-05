// allexenterandrun

function go (taskobj) {
  console.log('got sink', !!taskobj.sink);
  process.exit(0);
}

module.exports = {
  sinkname: "EntryPoint",
  identity: {
    username: 'systemadmin',
    password: '123456'
  },
  cb: go
};
