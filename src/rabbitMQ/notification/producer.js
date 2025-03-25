const { getChannel } = require('./connection');

async function publishMessage(message) {
    try {
        const channel = await getChannel();
        const queueName = 'notification';
        await channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log('Message sent:', message);
    } catch (error) {
        console.error('Error publishing message:', error);
    }
}

const testNotification = {
    channel: 'push',
    token: 'sample_fcm_token',
    payload: { title: 'Test Title', body: 'Test Body' }
};


publishMessage(testNotification);

module.exports = { publishMessage };

// async function publishMessage(message) {
//     try {
//         const channel = await getChannel();
//         const exchangeName = 'logs';
//         const exchangeType = 'fanout';
//         // create exchange if it doesn't exist & if RabbitMQ restarts, the exchange will be persisited { durable: true }
//         await channel.assertExchange(exchangeName, exchangeType, { durable: true }); 
//         // '' Routing key (empty because fanout exchanges ignore routing keys).
//         // Converts the JSON string into a binary buffer
//         channel.publish(exchangeName, '', Buffer.from(JSON.stringify(message))); 
//         console.log('Message sent:', message);
//     } catch (error) {
//         console.log('Error publishing message:', error);
//     }
// }

// publishMessage(msg);