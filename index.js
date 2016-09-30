var Etcd = require('node-etcd');
var flatten = require('flat');
var unflatten = flatten.unflatten;
var extend = require('extend');
var subordinate = require('subordinate');
var EventEmitter = require('events').EventEmitter;
var cluster = require('cluster');
var util = require('util');

function EtcdSimpleConfig(host, port) {
  EventEmitter.call(this);

  if (host instanceof Array){
    this.etcd = new Etcd(host, arguments[1]);
  } else {
    this.etcd = new Etcd(host+":"+port, arguments[2]);
  }
  this.store = {};
}

util.inherits(EtcdSimpleConfig, EventEmitter);

var getNodeValue = function(node) {
  var val = node.value;
  try {
    val = JSON.parse(val);
  } catch(e) {}
  if (val && typeof val === "object" && ('_value' in val)) {
    val = val._value;
  }
  return val;
};

var traverseObject = function(node, parentKey) {
  var obj = {};
  if (!node || !node.key) {
    return;
  }
  var key = node.key;
  if (parentKey) {
    key = key.replace(parentKey, '');
  }

  if(node.nodes && node.nodes.length) {
    node.nodes.forEach(function(n) {
      var nodeKey = n.key.replace(node.key, '');
      if (nodeKey.indexOf('/') == 0) {
        nodeKey = nodeKey.substr(1);
      }
      var tmp = traverseObject(n, node.key);
      obj[nodeKey] = tmp;
    });
  } else {
    return getNodeValue(node);
  }

  return obj;
};

EtcdSimpleConfig.prototype.get = function(key) {
  var req = this.etcd.getSync(key, {recursive: true});
  return traverseObject(req.body.node);
};


EtcdSimpleConfig.prototype.set = function(prefix, obj) {
  var values = flatten(obj, { safe: true, delimiter: '/' });
  var self = this;

  Object.keys(values).forEach(function(key){
    process.env.DEBUG && console.log('setSync', prefix +'/'+ key, values[key]);
    self.etcd.setSync(prefix +'/'+ key, JSON.stringify({ _value: values[key] }));
  });
};

EtcdSimpleConfig.prototype.toJSON = function(prefix) {
  if (prefix) {
    return JSON.parse(JSON.stringify(this.store[prefix]));
  }
  return JSON.parse(JSON.stringify(this.store));
};

EtcdSimpleConfig.prototype.bind = function(prefix, defaultObj, watch) {
  var existing = this.get(prefix);
  var obj = extend(defaultObj, existing);
  this.store[prefix] = obj;
  if (cluster.isMaster) {
    this.set(prefix, obj);
  }
  if (watch) {
    var watcher = this.etcd.watcher(prefix, null, {recursive: true});
    var self = this;
    watcher.on('change', function(req) {
      var changeKey = req.node.key.replace(prefix, '');
      while (changeKey.indexOf('/') == 0) {
        changeKey = changeKey.substr(1);
      }
      var change = {};
      var wasChanged = false;
      if (!req.node.value) {
        // value deleted
        var parts = changeKey.split('/');
        var pointer = self.store[prefix];
        while (parts.length > 1) {
          var key = parts.shift();
          if (pointer[key]) {
            pointer = pointer[key];
          } else {
            pointer = false;
            break;
          }
        }
        if (pointer && pointer[parts[0]]) {
          delete pointer[parts[0]];
        }
      } else {
        change[changeKey] = getNodeValue(req.node);
      }

      var change = unflatten(change, { safe: true, delimiter: '/' });
      if (self.store[prefix]) {
        if (!subordinate(self.store[prefix], change)) {
          extend(true, self.store[prefix], change);
          wasChanged = true;
        }
      }
      if (wasChanged) {
        process.env.DEBUG && console.log('change', changeKey, change);
        if (typeof watch == 'function') {
          watch(changeKey, change);
        }
        self.emit('change', changeKey, change);
        self.emit('change:'+changeKey, change);
      }
    });
  }
  return this;
};

module.exports = EtcdSimpleConfig;
