const amqp = require('amqplib/callback_api');
const config = require('./config');

const amqpCfg = config.get('amqp')
const rabbit = `amqp://${amqpCfg.user}:${amqpCfg.password}@${amqpCfg.host}:${amqpCfg.port}${amqpCfg.vhost}`;

class AmqpClient {
    constructor() {
        this.connection = null;
        this.channel = null;

        if (!AmqpClient.instance) {
            AmqpClient.instance = this;
        }
        return AmqpClient.instance;
    }

    connect() {
        return amqp.connect(rabbit, (err0, conn) => {
            if (err0) throw err0;
            this.connection = conn;
            console.log('AMQP Initialized')
            conn.createChannel((err1, ch) => {
                if (err1) throw err1;
                this.channel = ch;
            });
        });
    };

    // consume(exchange, type, opts, queue, opts) {
    //     this.channel.assertExchange(exchange, type, opts);

    //     this.channel.assertQueue(queue)
    // }
}

module.exports = { AmqpClient };