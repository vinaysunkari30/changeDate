const core = module.exports = {};
const fs = require('fs');
const path = require('path');
// const git = require('nodegit');

const DEFAULT_TARGET_DIR = './';

// core.installFromGit = (gitUrl, targetDir) => {
//   return new Promise((ok, bad) => {
//     git.Clone(gitUrl, targetDir || DEFAULT_TARGET_DIR)
//     .then((repo) => {
//       console.log('repo')
//     })
//     .catch(bad)
//   });
// };

core.installFromDir = (dirPath, targetDir) => {
  const pkgPath = path.join(dirPath, '/package.json');
  return new Promise((ok, bad) => {
    fs.stat(dirPath, (error, stat) => {
      if (error) return bad(error);
      if (stat.isDirectory()) {
        fs.stat(pkgPath, (error, stat) => {
          if (error) return bad(error);
          if (stat.isFile()) {
            const pkg = JSON.parse(fs.readFile(pkgPath,'utf8'));
            console.log(pkg);
          } else {
            bad(new Error('Missing package.json'));
          }
        });
      } else {
        bad(new Error('Not a directory'));
      }
    });
  });
};

core.installFromZip = () => {};


