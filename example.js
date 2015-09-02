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

// Bind a etcd path, providing the default config, get the current config and start watching for updates

var config = etcdConfig.bind(prefix, defaultConfig, function(key, change){
	console.log('Config changed', change, config);
});

console.log('config', config);

// add or update values
etcdConfig.set(prefix, { another_value: 'Another value' });
etcdConfig.set(prefix, { max_requests: 3 });
