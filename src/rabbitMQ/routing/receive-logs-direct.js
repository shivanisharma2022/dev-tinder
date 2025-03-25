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
        var severities = ['error'];

        channel.assertExchange(exchange, 'direct', { durable: false });
        channel.assertQueue('', { exclusive: true }, function (error2, q) {
            if (error2) {
                throw error2;
            }

            severities.forEach(function (severity) {
                channel.bindQueue(q.queue, exchange, severity);
            });

            channel.consume(q.queue, function (msg) {
                console.log(">>>>>>>>>>>>>>>>>>>>>", msg.fields.routingKey, msg.content.toString());
            }, {
                noAck: true
            });
        });
    });
});