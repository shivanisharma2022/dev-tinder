const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { sesClient } = require('./sesClient');
require('dotenv').config();

const createSendEmailCommand = (toAddress, fromAddress, subject, body) => {
    return new SendEmailCommand({
        Destination: {
            CcAddresses: [],
            ToAddresses: [toAddress],
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `<h1>${body}</h1>`,
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: 'This is the message body in text.',
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject,
            },
        },
        Source: fromAddress,
        ReplyToAddresses: [],
    });
}

const run = async(subject, body) => {
    const SendEmailCommand = createSendEmailCommand(
        process.env.RECEIVER_EMAIL,
        process.env.SENDER_EMAIL,
        subject,
        body
    )

    try {
        return await sesClient.send(SendEmailCommand);
    } catch (error) {
        if(error instanceof Error & error.name === 'MessageRejected') {
            const messageRejectedError = error;
            return messageRejectedError;
        }
        throw error;
    }
}

module.exports = { run };