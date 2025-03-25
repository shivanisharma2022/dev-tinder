// Example of named queues in RabbitMQ. 
// This is a simple example of a producer that sends a message to a queue named hello. 
// The message is a simple string, Hello world. The queue is created if it does not exist

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }
        var queue = 'hello';
        var msg = 'Hello world';

        channel.assertQueue(queue, { durable: false });
        channel.sendToQueue(queue, Buffer.from(msg));
        console.log("Message Sent:", msg);
    });

    setTimeout(function () {
        connection.close();
        process.exit(0);
    }, 500);
});
