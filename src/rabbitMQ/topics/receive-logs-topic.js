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
    var routingKeys = ['logs.error'];

    channel.assertExchange(exchange, 'topic', { durable: false });

    channel.assertQueue('', { exclusive: true }, function (error2, q) {
      if (error2) {
        throw error2;
      }

      routingKeys.forEach(function (key) {
        channel.bindQueue(q.queue, exchange, key);
      });
      console.log(`Waiting for messages in queue: ${q.queue}.`);
      channel.consume(q.queue, function (msg) {
        console.log("Message received", msg.fields.routingKey, msg.content.toString());
      }, {
        noAck: true
      });
    });
  });
});