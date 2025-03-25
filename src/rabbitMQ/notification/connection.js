const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://127.0.0.1';
let connection, channel;

async function createConnection() {
    try {
        console.log('Connecting to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);
        // Listens for connection errors. 'error' event type is emitted when there is an error in the connection
        connection.on('error', async (err) => {
            console.log('RabbitMQ connection error:', err);
            await closeConnection();
            setTimeout(createConnection, 5000);
        });
        // Listens for connection close events. 'close' event type is emitted when the connection is closed
        connection.on('close', async (err) => {
            console.log('RabbitMQ connection closed. Reconnecting...', err);
            await closeConnection();
            setTimeout(createConnection, 5000);
        });
        channel = await connection.createChannel();
        await channel.prefetch(1); // Ensures fair dispatch in consumer
        console.log('RabbitMQ channel created successfully.');
        console.log('RabbitMQ connected successfully.');
    } catch (error) {
        console.log('Failed to connect to RabbitMQ:', error);
    }
}

async function getChannel() {
    if (!channel) {
        await createConnection();
    }
    return channel;
}

async function closeConnection() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('RabbitMQ connection closed.');
    } catch (error) {
        console.error('Error closing RabbitMQ connection:', error);
    }
}

module.exports = { getChannel };