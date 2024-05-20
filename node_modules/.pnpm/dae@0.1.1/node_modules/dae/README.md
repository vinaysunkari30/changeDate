# [dae]()

> dae is a enviroment for long-running nodejs scripts or **daemons**.

Create virtual ecosystems where daemons run for 24/7 and may communicate anytime with other daemons through a standardized protocol refered to as **Common TCP**.

## Daemon

*see ./sample folder*

#### Creating

There are two requirements:

1. A daemon must be a class that inherits the `Daemon` class
2. A daemon must define their `name`

*custom-daemon.js*
```js
const {Daemon} = require('dae');
class CustomDaemon extends Daemon {
  constructor() {
    super({name: 'CustomDaemon'});
  }
}
new CustomDaemon();
```

#### Running

Dae is a special Daemon that manages all daemons, to install a daemon you need the *name* of the daemon and the *path* to the main script.

```
const path = require('path');
const {Dae} = require('dae');
const dae = new Dae();
dae.install('Sample', path.resolve('./sample/daemon.js'));
```

# Concepts

> [dae]() is inspired by [Digimon](), a fictional franchise about digital monsters that live in a digital world that exists in a universe parallel to a human universe. Digimon are made of information, and each Digimon's unique information manifests as the monster's physical apperance and abilities.

## Common TCP
A mechanism where Daemons may communicate other Daemons by sending commands through a bi-directional TCP connection.

A command is made up three parts:

1. The `name` of the event to trigger
2. A single space character that serves as a seperator *optional*
3. A serialized **JSON** string that servers as the event's `arguments` *optional*

A command will emit a Event on its **Guest Socket** instance, with the same `name` and `arguments`, if any.

**Example of a Raw Packet**: `nameofcommand ["argument1", {x: "argumenttwo"}]`

A person may communicate with a daemon through clients such as telnet and netcat.

#### Required Commands

All daemons are required to implement the following commands:

1. dae - Return Daemon's *Credential*
2. options - Returns an object where the *keys* are the names of the commands that are available and *keys* are the number of arguments the commmand is expecting.

This allows daemons to identify each other and quickly see what commands are available to each other.

## Daemon
Any class that implements the `Daemon` class.

## Guest
A `net.Socket` wrapper that seamlessly communicates with other Daemons through a EventEmitter infterface that sits on top of the CommonTCP protocol.

## Dae
Daemon whose purpose is to manage all Daemons. 

Dae periodically checks all opened tcp connection, and identifies Daemons through the CommonTCP protocol & stores it recent `pid` (process id) and CommonTCP `port`, so as to aid other Daemon's in finding other Daemon's by their name.

Currently, sending the command `list` will return a array of Credential objects of all running daemons.

## LICENSE

MIT