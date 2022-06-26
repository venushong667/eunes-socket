const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const port = 5000;
const _ = require('lodash');
const uuid = require('uuid');
const { Server } = require('socket.io');
const io = new Server(server, { path: '/wss' });

const { AmqpClient } = require('./amqp');
const amqp = new AmqpClient();
amqp.connect();

var subscribed = {};

io.on('connection', (socket) => {

    socket.on('subscribe', (data, callback) => {
        const exchange = _.get(data, 'exchange');
        if (!exchange) return;
        console.log(`[${exchange}] Subscribe fanout request`, data);

        amqp.channel.assertExchange(exchange, 'fanout', {
            durable: false
        }, (err0, ok) => {
            if (err0) throw err0;

            amqp.channel.assertQueue(`ws.${uuid.v4()}`, {
                exclusive: true,
                autoDelete: true
            }, (err1, q) => {
                if (err1) throw err1;
                subscribed[exchange] = subscribed[exchange] || [];
                subscribed[exchange].push(q.queue);
                console.log(`[${exchange}] Created queue`, q.queue);

                amqp.channel.bindQueue(q.queue, exchange, '');
                amqp.channel.consume(q.queue, (message) => {
                    if (!message) return;
                    message = JSON.parse(message.content.toString());
                    console.log(`[${exchange}] Recevied from rabbit:`, { exchange: exchange, queue: q.queue, message: message });

                    socket.emit(exchange, { message: message });
                }, { noAck: true });
                callback({
                    queue: q.queue
                });
            });
        });
    });

    socket.on('subscribe-topic', (data, callback) => {
        const exchange = _.get(data, 'exchange');
        const topic = _.get(data, 'topic');
        const listen = _.get(data, 'listen');
        if (!exchange || !topic) return;
        console.log(`[${exchange}] Subscribe topic request`, data);

        amqp.channel.assertExchange(exchange, 'topic', {
            durable: false
        }, (err0, ok) => {
            if (err0) throw err0;

            amqp.channel.assertQueue(`ws.${uuid.v4()}`, {
                exclusive: true,
                autoDelete: true
            }, (err1, q) => {
                if (err1) throw err1;
                subscribed[exchange] = subscribed[exchange] || [];
                subscribed[exchange].push(q.queue);
                console.log(`[${exchange}] Created queue`, q.queue);
                
                amqp.channel.bindQueue(q.queue, exchange, topic);
                amqp.channel.consume(q.queue, (message) => {
                    if (!message) return;
                    message = JSON.parse(message.content.toString());
                    console.log(`[${exchange}] Recevied from rabbit:`, { topic: topic, queue: q.queue, message: message });

                    socket.emit(listen, { topic: topic, message: message });
                }, { noAck: true });
                callback({
                    queue: q.queue
                });
            });
        });
    });

    socket.on('unsubscribe', (data) => {
        const exchange = _.get(data, 'exchange');
        const queue = _.get(data, 'queue');
        if (!exchange) return;

        const removedQueue = _.remove(subscribed[exchange], (q) => q == queue);
        if (_.isEmpty(subscribed[exchange])) {
            delete subscribed[exchange];
        }
        if (removedQueue[0]) {
            console.log(`Unsubscribed: ${queue} from exchange ${exchange}`);
            amqp.channel.unbindQueue(queue, exchange);
            amqp.channel.deleteQueue(queue);
        }
    });

    socket.on('publish', (data) => {
        try {
            const exchange = _.get(data, 'exchange');
            const routingKey = _.get(data, 'topic', '');
            const content = JSON.stringify(_.get(data, 'content'));
            if (!exchange) return;
            console.log(`[${exchange}] Published from UI`, data);
            amqp.channel.publish(exchange, routingKey, Buffer.from(content));
        } catch (e) {
            throw e;
        }
    });
    
    socket.on('disconnect', () => {
        for (const exchange in subscribed) {
            _.each(subscribed[exchange], (queue) => {
                _.remove(subscribed[exchange], (q) => q == queue);
                amqp.channel.unbindQueue(queue, exchange);
                amqp.channel.deleteQueue(queue);
            });
            if (_.isEmpty(subscribed[exchange])) {
                delete subscribed[exchange];
            }
        }
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});