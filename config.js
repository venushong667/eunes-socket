var convict = require('convict');

var config = convict({
    name: "socket",
    env: {
        doc: 'The application environment.',
        format: ['prod', 'dev', 'test'],
        default: 'dev',
        env: 'NODE_ENV'
    },
    port: {
        doc: 'The port to bind.',
        format: 'port',
        default: 5000,
        env: 'PORT',
        arg: 'port'
    },
    amqp: {
        host: {
            doc: 'AMQP host.',
            format: String,
            default: 'rabbit',
            env: 'AMQP_HOST'
        },
        port: {
            doc: 'AMQP port.',
            format: Number,
            default: 5672,
            env: 'AMQP_PORT'
        },
        user: {
            doc: 'AMQP user.',
            format: String,
            default: 'rabbit',
            env: 'AMQP_USER'
        },
        password: {
            doc: 'AMQP password.',
            format: String,
            default: 'password',
            env: 'AMQP_PASSWORD'
        },
        vhost: {
            doc: 'AMQP vhost.',
            format: String,
            default: '/',
            env: 'AMQP_VHOST'
        }
    }
})

// Load environment dependent configuration
var env = config.get('env');
config.loadFile('./config/' + env + '.json');

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;