/**
* Sample - A Daemon that serves as shared memory for other Daemons
*/
const {Daemon} = require('..');

class Sample extends Daemon {
  constructor(props) {
    super({name: 'Sample'});
    this.reset();
    this.on('guest', (guest) => {
      guest.on('all', () => guest.emit('memory', this.memory));
      guest.on('set', (key, value) => this.memory[key] = value);
      guest.on('get', (key) => guest.emit(key, this.memory[key]));
      guest.on('reset', () => this.reset());
    });

    // Connect via CommontTCP with Dae daemon
    this.connectWithDae()
    .then((guest) => {
      guest.emit('list');
      guest.on('daemons', (daemons) => {
        console.log('daemons installed', daemons);
      });
    })
    .catch((error) => console.log(error));

    // Use Dae to looup a Daemon by its name
    this.getDaemonByName('Sample')
    .then((credential) => {
      console.log('credential from Dae', credential);
    })
    .catch((error) => console.log(error));
  }
  reset() {
    this.memory = {};
  }
}

if (process.env.DAE) {
  new Sample();
} else {
  module.exports = Sample;
}
