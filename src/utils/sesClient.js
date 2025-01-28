const { SESClient } = require('@aws-sdk/client-ses');
require('dotenv').config();
// Create an Amazon SES service client object.
const sesClient = new SESClient({
    region: process.env.AWS_REGION, 
    credentials:
    {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

module.exports = { sesClient };