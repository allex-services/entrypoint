// allexenterandruntask

function printusage () {
  console.log('Usage: allexenterandruntask testSecondPhase <sessionid> <smstoken>');
}

if (!process.argv[3]) {
  printusage();
  process.exit(1);
}

if (!process.argv[4]) {
  printusage();
  process.exit(1);
}


function go (taskobj) {
  console.log('got sink', !!taskobj.sink);
  process.exit(0);
}

module.exports = {
  sinkname: "EntryPoint",
  identity: {
    session: process.argv[3],
    secondphasetoken: process.argv[4]
  },
  cb: go
};
