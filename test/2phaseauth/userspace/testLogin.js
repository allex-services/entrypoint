// allexenterandrun

module.exports = {
  sinkname: "EntryPoint",
  identity: {
    username: 'user',
    password: '123456'
  },
  cb: console.log.bind(console, 'here we go')
};
