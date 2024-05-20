/**
* Provides Daemon interface
*
* @module Dae
* @submodule Daemon
*/
const {EventEmitter} = require('events');
const net = require('net');
const crypto = require('crypto');
const Guest = require('./guest');
const Credential = require('./credential');
const Packet = require('./packet');
const log = require('./log')('Daemon');

// Only for Daemons instanciated by Dae
const {DAE_PID, DAE_PORT, DAE_SECRET} = process.env;

/**
* Returns a port that is not being used by another process.
* @private
* @async
* @param [port] {Numeric} - A number between 1024 && 9999
* @param callback {Function}
*           @param error {Error|null}
*           @param port {Number} - Port that is avaiable
*/
const getAvailablePort = (port, callback) => {
  if (typeof port === 'function') callback = port, port = null;
  if (!port || port < 0 || port < 1024 || port > 9999) port = 1024 + Math.ceil(Math.random() * 8192);
  const testServer = net.createServer();
  testServer
  .once('error', (error) => error.code === 'EADDRINUSE' ? getAvailablePort(port + 1, callback) : callback(error))
  .once('listening', () => testServer.once('close', () => callback(null, port)).close());
  testServer.listen(port);
};

/**
* Daemon class inherited by all daemons. Provides Common TCP interface
* @public
*/
class Daemon extends EventEmitter {
  constructor(props) {
    super();
    const {name} = props;

    // Daemon logger
    this.log = require('./log')(name);

    // CommonTCP Server
    const server = net.createServer({allowHalfOpen: false, pauseOnConnect: false});

    // Private storage
    Object.defineProperty(this, '_daemon_', {
      configurable: false,
      enumerable: false,
      writeable: false,
      value: { server, name }
    });

    // Listen for a tcp connection
    server.on('connection', (socket) => {
      const {remoteAddress} = socket;
      this.log('CommonTCP connection', remoteAddress);

      // Wrap socket in a Guest instance
      const guest = new Guest(socket);

      /**
      * Add Required Responses
      */

      // whois
      guest.on('whois', () => guest.emit('credential', this.credential));

      // options
      guest.on('options', () => {
        const commands = {};
        Object.keys(guest._events).forEach(eventName => commands[eventName] = guest._events[eventName].length);
        guest.emit('commands', commands);
      });

      // DEPRECATED dae
      guest.on('dae', () => {
        // const credential = {name, pid, port, secret};
        guest.emit('credential', this.name, process.pid, this.port, DAE_SECRET).then(() => guest.socket.end());
      });

      // Expose
      this.emit('guest', guest);
    });
    server.on('error', (error) => this.log('CommonTCP', 'error', error.stack));
    server.on('close', () => this.log('CommonTCP', 'closed', remoteAddress));
    server.on('listening', () => {
      const address = this._daemon_.address = server.address();
      this.log('CommonTCP', 'listening on', address.address, address.port);
    });

    this.log('CommonTCP', 'looking for avaiable port');
    getAvailablePort((error, port) => {
      if (error) throw error;
      this.log('CommonTCP', 'port found', port);
      server.listen(port);
    });
  }
  get port() {
    const {server} = this._daemon_;
    if (!server.listening) return null;
    const address = server.address();
    return address.port;
  }
  get name() {
    return this._daemon_.name;
  }
  get credential() {
    return new Credential({
      name: this.name,
      pid: process.pid,
      port: this.port,
      secret: DAE_SECRET
    });
  }
  connect(port) {
    const socket = net.createConnection({port}, () => {
      // Send CommonTCP `dae` packet; request credentials
      const packet = new Packet('dae', []);
      socket.write(packet.toBuffer(), () => socket.end());
    });
    socket.setTimeout(2000);
    return socket;
  }
  getAvailablePort(port) {
    return new Promise((ok, bad) => {
      getAvailablePort(port, (error, port) => {
        if (error) return bad(error);
        ok(port);
      });
    });
  }
  getDaemonsBy(propName, testValue) {
    const lcase = (x) => String(x).toLowerCase();
    return new Promise((ok, bad) => {
      this.connectWithDae()
      .then((guest) => {
        guest.emit('list');
        guest.on('daemons', (daemons) => {
          const matches = daemons.filter((x) => lcase(x[propName]) === lcase(testValue));
          ok(matches);
        });
      })
      .catch(bad);
    });    
  }
  getDaemonByName(name) {
    const lcase = (x) => x.toLowerCase();
    return new Promise((ok, bad) => {
      this.getDaemonsBy('name', name)
      .then((daemons) => {
        const matches = daemons.filter((x) => lcase(x.name) === lcase(name));
        ok(matches[0]);
      })
      .catch(bad);
    });
  }
  connectWithDae() {
    return new Promise((ok, bad) => {
      const guest = new Guest({port: DAE_PORT});
      guest.on('connection', () => {
        ok(guest)
      });
      guest.on('error', bad);
    });
  }
  connectWith(daemonName) {
    return new Promise((ok, bad) => {
      this.getDaemonByName(daemonName)
      .then((credential) => {
        if (credential && credential.port) {
          const guest = new Guest({port: credential.port});
          guest.on('connection', () => ok(guest));
          guest.on('error', bad);
        } else {
          bad(new Error('Not Found'))
        }
      })
      .catch(bad);
    });
  }
}

module.exports = Daemon;
