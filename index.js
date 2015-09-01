var Etcd = require('node-etcd');
var flatten = require('flat');
var unflatten = flatten.unflatten;
var extend = require('extend');

function EtcdSimpleConfig(host, port) {
  if (host instanceof Array){
    this.etcd = new Etcd(host, arguments[3], arguments[4]);
  } else {
    this.etcd = new Etcd(host, port, arguments[3], arguments[4]);
  }
  this.store = {};
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
    var val = node.value;
    try {
      val = JSON.parse(node.value);
    } catch(e) {};
    return val;
  }

  return obj;
};

EtcdSimpleConfig.prototype.get = function(key) {
  var req = this.etcd.getSync(key, {recursive: true});
  return traverseObject(req.body.node);
};


EtcdSimpleConfig.prototype.set = function(prefix, obj) {
  if (typeof key == 'object' && !obj) {
    obj = key;
    key = '/';
  }
  var values = flatten(obj, { safe: true, delimiter: '/' });
  var self = this;

  Object.keys(values).forEach(function(key){
    process.env.DEBUG && console.log('setSync', prefix +'/'+ key, values[key]);
    self.etcd.setSync(prefix +'/'+ key, values[key]);
  });
};

EtcdSimpleConfig.prototype.bind = function(prefix, defaultObj, watch) {
  var existing = this.get(prefix);
  var obj = extend(defaultObj, existing);
  this.store[prefix] = obj;
  this.set(prefix, obj);

  if (watch) {
    var watcher = this.etcd.watcher(prefix, null, {recursive: true});

    var self = this;
    watcher.on('change', function(req) {
      var changeKey = req.node.key.replace(prefix, '');
      while (changeKey.indexOf('/') == 0) {
        changeKey = changeKey.substr(1);
      }
      var obj = {};
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
        obj[changeKey] = req.node.value;
      }

      obj = unflatten(obj, { safe: true, delimiter: '/' });
      if (self.store[prefix]) {
        extend(true, self.store[prefix], obj);
      }
      process.env.DEBUG && console.log('change', changeKey, obj);
      if (typeof watch == 'function') {
        watch(changeKey, obj);
      }
    });
  }
  return obj;
};

module.exports = EtcdSimpleConfig;
