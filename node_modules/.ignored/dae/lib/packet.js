/**
* A model for a packet used in Common TCP communication.
* @private
* @param name {String}
* @param data {Object} - any valid JSON type
**/
class Packet {
  constructor(name, data) {
    Object.defineProperty(this, '_packet_', {
      configurable: false,
      enumerable: false,
      writeable: false,
      value: { name: name, data }
    });
  }
  get data() { return this._packet_.data }
  get name() { return this._packet_.name }
  toArray() {
    const args = [];
    args.push(this.name);
    for (let i = 0, l = this.data.length; i < l; i++) {
      args.push(this.data[i]);
    }
    return args;
  }
  toBuffer() {
    const {name, data} = this._packet_;
    // console.log('_packet_', this._packet_)
    const json = JSON.stringify(data);
    const size = name.length + 1 + json.length;
    const buffer = Buffer.allocUnsafe(size);
    let i = -1;
    while(++i < name.length) buffer[i] = name.charCodeAt(i);
    buffer[i] = ' '.charCodeAt(0); 
    i++;
    for (var j = 0; j < json.length; j++) buffer[i++] = json[j].charCodeAt(0);
    return buffer;
  }
  toString() { return this.toBuffer().toString(); }
  valueOf() { this.toBuffer() }
  static fromBuffer(buffer) {
    const index = buffer.indexOf(' ');
    const name = buffer.slice(0, index).toString().trim();
    const json = buffer.slice(index + 1);
    if (!name) return null;
    try {
      const data = JSON.parse(json);
      return new Packet(name, data);
    } catch(ex) {
      return new Packet(name, []);
    }
  }
}
module.exports = Packet;