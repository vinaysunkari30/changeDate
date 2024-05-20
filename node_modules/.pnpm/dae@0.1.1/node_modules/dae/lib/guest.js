/**
* Thin wrapper for sockets connecting via Common TCP.
* @private
* @param socket {net.Socket}
**/
const net = require('net');
const Packet = require('./packet');
const {EventEmitter} = require('events');

class Guest extends EventEmitter {
  constructor(socket) {
    // Wrap or create socket
    if (!(socket instanceof net.Socket)) {
      const options = socket;
      socket = net.createConnection(options, () => {
        console.log('connected');
        emit('connection');
      });
    }

    super();

    // Expose socket
    this.socket = socket;

    const emit = this.emit.bind(this);

    this.socket.on('data', (data) => {
      const packet = Packet.fromBuffer(data);
      if (packet) {
        emit('packet', packet.toBuffer().toString());
        emit.apply(this, packet.toArray());
      } else {
        // DEBUG
      }
    });

    this.emit = function(name) {
      return new Promise((ok) => {
        this.socket.write(new Packet(name, Array.prototype.slice.call(arguments, 1)).toBuffer(), ok);
      });
    }
  }
  end() { this.socket.end(); }
}

module.exports = Guest;
