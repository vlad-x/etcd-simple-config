# etcd-simple-config
Simple config management with Etcd

`npm install etcd-simple-config --save`

See [example.js](https://github.com/vlad-x/etcd-simple-config/blob/master/example.js)

## API

#### etcdConfig.bind(prefix, defaultConfig, changeCallback)
Bind etcd path `prefix`, providing the default config `defaultConfig`, get the current config and start watching for updates with `changeCallback`

```js
var etcdConfig = new EtcdSimpleConfig('127.0.0.1', 4001);

var config = etcdConfig.bind(prefix, defaultConfig, function(key, change){
	console.log('Config changed', change, config);
});
```

#### config = etcdConfig.get(prefix)
Get config

#### etcdConfig.set(prefix, obj)
Add or update values

## Listening for events instead of using the change callback

Listen for the 'change' event
```js
var config = etcdConfig.bind(prefix, defaultConfig, true);

config.on('change', function(key, change){
	console.log('on change', arguments);
});
```

or listen for a single field change
```js
config.on('change:max_requests', function(key, change){
	console.log('on max_requests change', arguments);
});
```
