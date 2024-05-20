/**
* Communication - A Daemon that connects with the Sample daemon and updates its internal memory
*/
const {Daemon} = require('..');

class Communication extends Daemon {
  constructor(props) {
    super({name: 'Communication'});
    this.heartbeat();
    setInterval(() => this.heartbeat(), 3000);
  }
  heartbeat() {
    // Use Dae to looup a Daemon by its name
    this.connectWith('Sample')
    .then((guest) => {
      guest.emit('all');
      guest.on('memory', (memory) => {
        console.log('Sample memory', memory);
        guest.emit('set', 'communicationWasHere', Date.now());
        guest.end();
      });
    })
    .catch((error) => console.log(error));
  }
}

if (process.env.DAE) {
  new Communication();
} else {
  module.exports = Communication;
}
