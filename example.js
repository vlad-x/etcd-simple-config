var EtcdSimpleConfig = require('./index');

var etcdConfig = new EtcdSimpleConfig();

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

var config = etcdConfig.bind('prefix/my-awesome-app', defaultConfig, function(key, change){
	console.log('Config changed', change, config);
});

console.log('config', config);
