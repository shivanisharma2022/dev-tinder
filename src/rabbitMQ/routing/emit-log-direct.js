// Example to subscribe only to a subset of the messages.
// direct messages according to the bindings or routing key.
// This script sends messages with a routing key that is a severity level.

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
    if (error0) {
        throw error0;
    }

    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        var exchange = 'direct_logs';
        var routingKey = 'error';
        var msg = 'This is an error message!';

        channel.assertExchange(exchange, 'direct', { durable: false });
        channel.publish(exchange, routingKey, Buffer.from(msg));
        console.log("MessageSent", routingKey, msg);

        setTimeout(function () {
            connection.close();
            process.exit(0);
        }, 500);
    });
});
