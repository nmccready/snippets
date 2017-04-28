var Promise = require('bluebird');
var execAsync = Promise.promisify(require('child_process').exec);
var path = require('path');

function getModules(options) {
  var orig = options.orig;
  var modules = options.modules;
  var subTree = options.subTree || 'peerDependencies';

  if (!modules) {
    var pathToMoules = path.join(__dirname, orig + './package.json');
    modules = require('pathToMoules')[subTree];
  }

  return modules;
}

function link(options) {
  var dest = options.dest;
  var orig = options.orig;

  dest = path.join(__dirname, dest);
  orig = path.join(__dirname, orig);

  return execAsync(['npm link', dest, orig].join(' '));
}

function linkAll(options) {
  var dest = options.dest;
  var orig = options.orig;
  var modules = options.modules || [];

  Promise.map(function(moduleName) {
    var nodeModule = '/node_modules/' + moduleName;
    var destModule = dest + nodeModule;
    var origModule = orig + nodeModule;

    return link({dest: destModule, orig: origModule});

  });

}

module.exports = {
  getModules: getModules,
  link: link,
  linkAll: linkAll
}
