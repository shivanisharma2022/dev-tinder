// Example to distribute time-consuming tasks among multiple workers.
// Each task is delivered to exactly one worker. 
// It will be used to schedule tasks to be performed later.

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
  if (error0) {
    throw error0;
  }

  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }

    var queue = 'task_queue';
    var msg = "Hello World!";

    channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
    console.log("Message Sent:", msg);

    setTimeout(function () {
      connection.close();
      process.exit(0);
    }, 500);
  });
});
