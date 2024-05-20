const path = require('path');
const {Dae} = require('..');
const dae = new Dae();

dae
.reset() // restart pm2 (process manager)
.then(() => {
  // Install sample daemon (auto starts)
  dae.install('Sample', path.resolve('./sample/daemon.js'));
  dae.install('Communication', path.resolve('./sample/communication.js'));
})
.catch((error) => console.log(error));
