/**
* dae/Dae - God Daemon 
*/
const fs = require('fs');
const net = require('net');
const child_process = require('child_process');
const pm2 = require('pm2');
const chalk = require('chalk');
const log = require('./log')('Dae');
const Daemon = require('./daemon');
const Packet = require('./packet');
const Credential = require('./credential');
const Registry = require('./registry');

const SCANNER_INTERVAL = 15000;

/**
* Lists all tcp ports that are listening.
* @private
*/
const listListeningTcpPorts = () => {
  const REG_NETSTAT_LINE_CAPTURE = /^(tcp|tcp6)\s+(\d+)\s+(\d+)\s+(.*?)\s+(.*?)LISTEN\s+(.*?)\s+$/gim;
  return new Promise((ok, bad) => {
    const netstat = child_process.spawn('netstat', ['-lntp']);
    netstat.on('error', bad);
    netstat.stdout.on('data', (data) => {
      const results = [];
      const result = data.toString();
      const lines = result.split('\n').map(x => x.trim()).filter(x => x);
      lines.forEach((line) => {
        const match = REG_NETSTAT_LINE_CAPTURE.exec(result);
        if (match) {
          const stat = {
            proto: match[1].trim(),
            recvQ: match[2].trim(),
            sendQ: match[3].trim(),
            address: match[4].trim(),
            foreignAddress: match[5].trim(),
          };
          const pidAndName = match[6].trim();
          if (pidAndName !== '-') {
            const tmp = pidAndName.split('/');
            stat.pid = +tmp[0];
            stat.program = tmp[1];
          }
          const tmp2 = stat.address.split(':');
          stat.port = +tmp2[tmp2.length -1];
          results.push(stat);
        }
      });
      ok(results);
    });
  });
};

/**
* Will connect to a Daemon through CommonTCP determine if port belongs
* to a Daemon
* @private
* @return {Promise} 
*     ok: Object with Credential-like information provided by Daemon if valid, otherwise falsy
*     bad: Error
*/
const validateDaemonByPort = (port) => {
  return new Promise((ok, bad) => {
    const daemonData = {};
    let dataChunksRecv = 0, ended = false;
    const done = () => {
      const {credential} = daemonData;
      if (credential) {
        const name = credential[0];
        const pid = credential[1];
        const port = credential[2];
        const secret = credential[3];
        const validCredential = name && pid && port && secret;
        if (validCredential) {
          ok({name,pid,port,secret});
        } else {
          ok(null);
        }
      } else {
        ok(null);
      }
    };
    // Connect & request credentials
    const socket = net.createConnection({port}, () => {
      // Send CommonTCP `dae` packet; request credentials
      const packet = new Packet('dae', []);
      socket.write(packet.toBuffer(), () => socket.end())
    });
    socket.setTimeout(2000);
    // Handle packets received
    socket.on('data', (data) => {
      const packet = Packet.fromBuffer(data);
      // Expecting only one packet 
      if (packet && dataChunksRecv < 1) {
        daemonData[packet.name] = packet.data;
        dataChunksRecv++;
      } else {
        console.log('destroying', dataChunksRecv);
        socket.destroy();
      }
    });
    socket.on('close', () => {
      if (ended) return;
      ended = true;
      done();
    });
  });
};

/**
* Dae
*/
class Dae extends Daemon {
  constructor() {
    super({name: 'Dae'});
    log('init');
    this.registry = new Registry();
    this.on('guest', (guest) => {
      // log('guest', guest);
      guest.on('whois', () => guest.emit('iam', 'Dae'));
      guest.on('list', () => {
        this.scan()
        .then(creds => {
          guest.emit('daemons', creds);

          // DEPRECATED
          creds.forEach(cred => {
            guest.emit('credential', cred.name, cred.pid, cred.port, cred.secret);
          });
        })
        .catch((error) => console.log(error));
      });
    });
    this.scanning = false;
    this.scannerRef = setInterval(() => {
      if (this.scanning) return;
      this.scanning = true;
      log('scan started');
      this.scan()
      .then((creds) => {
        this.scanning = false;
        log('scan found', creds.length, 'daemon(s)', '\n' + creds.map((cred)=> `... ${cred.name} ${cred.port} ${cred.secret}`).join('\n'));
        log('scan finished');
      })
      .catch((error) => {
        log('scan failed', `\n${chalk.red.bold(error.stack)}`);
        this.scanning = false;
      })
    }, SCANNER_INTERVAL);
  }
  install(daemonName, daemonPath) {
    const credential = new Credential({name: daemonName, secret: (Math.random()).toString(16)});
    const fstat = fs.statSync(daemonPath);

    if (!fstat || !fstat.isFile()) throw new Error('daemonPath is invalid')

    return new Promise((ok, bad) => {
      pm2.connect((error) => {
        if (error) return bad(error);
        const pm2Options = { 
          name: daemonName,
          env: {
            DAE: true,
            DAE_PID: process.pid,
            DAE_PORT: this.port,
            DAE_SECRET: credential.secret
          }
        };
        pm2.start(daemonPath, pm2Options, (error, proc) => {
          if (error) {
            const isErrorAlreadyLaunched = error.toString().indexOf('Script already launched') !== -1;
            if (isErrorAlreadyLaunched) {
              console.log('already launched');
              ok(null);
            } else {
              bad(error);
            }
          } else {
            credential.pid = proc[0].process.pid;
            // console.log('new credential', credential)
            this.registry.push(credential);
            ok(proc);
          }
        });
      });
    });
  }
  uninstall(daemonNameOrPid) {
    throw new Error('todo')
    return new Promise((ok, bad) => {
      pm2.connect((error) => {
        if (error) return bad(error);
        // pm2.delete(proc_name|proc_id|all, fn(err, proc){})
      });
    });    
  }
  reset() {
    return new Promise((ok, bad) => {
      pm2.delete('all', (error, proc) => {
        ok(proc);
      });      
    });
  }

  /**
  * Scan open TCP ports that are listening, and identify Daemons.
  *
  * @param [options] {Object}
  * @return {Promise} 
  *     ok: Array of Credential instances.
  *     bad: Error
  */
  scan(options) {
    return new Promise((resolve, reject) => {
      listListeningTcpPorts()
      .then((stats) => {
        // Daemons that where instanciated by Dae SHOULD show their pid, unlike other processes
        const candidates = stats.filter(stat => stat.pid).filter(stat => stat.port).filter(stat => stat.pid != process.pid);

        if (candidates.length === 0) {
          resolve();
          return log('scan did not find any daemons');
        }

        const promises = candidates.map(stat => {
          return new Promise((ok, bad) => validateDaemonByPort(stat.port).then(ok).catch(bad));
        });

        Promise.all(promises)
        .then((results) => {
          let foundCount = 0;

          // Filter out missing or invalid credentials 
          const daemonCredentials = results.filter(cred => cred && this.registry.lookupBySecret(cred.secret));

          if (daemonCredentials.length === 0) {
            resolve();
            return log('scan did not find any valid daemons');
          }

          const found = [];
          daemonCredentials.forEach(daemonCredential => {
            const realCredential = this.registry.lookupBySecret(daemonCredential.secret);
            // const timeSinceCreated = Date.now() - realCredential.created;
            if (daemonCredential.name === realCredential.name) {
              foundCount++;
              realCredential.port = daemonCredential.port;
              realCredential.updated = Date.now();
              found.push(realCredential);
            } else {
              log('scan found copy cat', daemonCredential, realCredential);
            }
          });
          resolve(found);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}

module.exports = Dae;
