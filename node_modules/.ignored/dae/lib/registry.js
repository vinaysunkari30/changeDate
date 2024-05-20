/**
* Container for Credential instances for each Daemon that is installed.
* @private
*/
const Credential = require('./credential');

class Registry {
  constructor() { this._memory = []; }
  get length () { return this._memory.length; }
  get(x) { return this._memory[x] || null; }
  push(credential) {
    if (credential instanceof Credential) {
      this._memory.push(credential);
    } else {
      throw new Error('Invalid credential');
    }
  }
  lookupBySecret(secret) {
    for (var i = 0; i < this.length; i++) {
      const credential = this.get(i);
      if (credential.secret === secret) return credential;
    }
    return null;    
  }
}

module.exports = Registry;
