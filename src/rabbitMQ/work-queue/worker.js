var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
  if (error0) throw error0;

  connection.createChannel(function (error1, channel) {
    if (error1) throw error1;

    var queue = 'task_queue';

    channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);
    console.log("Waiting for messages in", queue);

    channel.consume(queue, function (msg) {
      console.log("Received:", msg.content.toString());

      setTimeout(function () {
        console.log("Done processing");
        channel.ack(msg);
      }, 2000);
    }, { noAck: false });
  });
});
