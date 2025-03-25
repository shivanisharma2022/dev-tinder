// Example to send a message to a topic exchange

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
  if (error0) {
    throw error0;
  }

  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }

    var exchange = 'topic_logs';
    var routingKey = 'logs.error';
    var msg = 'This is an error log!';

    channel.assertExchange(exchange, 'topic', { durable: false });
    channel.publish(exchange, routingKey, Buffer.from(msg));
    console.log("Message Sent", routingKey, msg);

    setTimeout(function () {
      connection.close();
      process.exit(0);
    }, 500);
  });
});
