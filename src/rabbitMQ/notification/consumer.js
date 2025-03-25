const { getChannel } = require('./connection');
const { sendPushNotification, sendPushNotificationBatch } = require('../../firebase/firebase');

async function consumeMessages() {
    try {
        const channel = await getChannel();
        const queueName = 'notification';
        await channel.assertQueue(queueName, { durable: true });

        console.log('Waiting for messages...');

        await channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                try {
                    const notification = JSON.parse(msg.content.toString());
                    console.log('Received message:', notification);

                    if (notification.channel === "push") {
                        if (Array.isArray(notification.tokens)) {
                          await sendPushNotificationBatch(notification.tokens, notification.payload);
                        } else {
                          await sendPushNotification(notification.token, notification.payload);
                        }
                      }

                    channel.ack(msg); // Acknowledge only if successful
                } catch (err) {
                    console.error('Error processing message:', err);
                    channel.nack(msg, false, true); // Requeue the message
                }
            }
        }, { noAck: false });
    } catch (error) {
        console.error('Error consuming messages:', error);
    }
}

consumeMessages();

// async function consumeMessages() {
//     try {
//         const channel = await getChannel();
//         const queueName = 'logs';
//         const exchangeName = 'logs';
//         // create queue if it doesn't exist & if RabbitMQ restarts, the queue will be persisited { durable: true }
//         await channel.assertQueue(queueName, { durable: true });
//         // bind the queue to the exchange and '' routing key (empty because fanout exchanges ignore routing keys)
//         await channel.bindQueue(queueName, exchangeName, '');
//         console.log('Waiting for messages...');
//         // listens and consumes messages from the queue
//         await channel.consume(queue, (msg) => {
//             if (msg !== null) {
//                 // Converts the binary buffer into a JSON string and then converts the JSON string into an object
//                 const content = JSON.parse(msg.content.toString());
//                 console.log('Received message:', content);
//                 channel.ack(msg); // acknowledges the message and removes it from the queue
//             }
//         },
//         // Ensures messages are not lost if the consumer crashes before processing.
//         // If the consumer crashes, the message will be requeued and thus prevents message loss
//         //if true, Messages are removed from the queue immediately after being delivered, even if the consumer fails or crashes before processing.
//             { noAck: false }
//         );
//     } catch (error) {
//         console.log('Error consuming messages:', error);
//     }
// }

// consumeMessages();
