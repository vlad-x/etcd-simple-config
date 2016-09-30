var cluster = require('cluster');

var EtcdSimpleConfig = require('./index');

var etcdConfig = new EtcdSimpleConfig('127.0.0.1', 4001);

var defaultConfig = {
	title: 'Hello world',
	max_requests: 10,
	mongo: {
		name: 'test',
		host: '127.0.0.1',
		port: 27017
	},
	redis: {
		host: '127.0.0.1'
	}
};

var prefix = 'prefix/my-awesome-app';

// Shoud write config only in master
var config = etcdConfig.bind(prefix, defaultConfig, function(key, change){
	console.log('Config changed', change, config);
});

console.log('config', config.toJSON(prefix), process.pid);

if (cluster.isMaster) {
	for (var i=0; i<3; i++) {
		cluster.fork()
	}
}
