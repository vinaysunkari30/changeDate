const chalk = require('chalk');
const util = require('util');

function log(name, options) {
  return (function(){
    let lastLogDate = 0;
    function daeLogger() {
      const tDelta = (lastLogDate) ? (Date.now() - lastLogDate) : null
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(x => {
        return (typeof x === 'string') ? x : util.inspect(x, {depth: 4, colors: true});
      }).join(' ');
      process.stdout.write(`${chalk.bold.white(name)} ${message}\n`);
      lastLogDate = Date.now();
    };
    return daeLogger;
  }());
}

module.exports = log;
