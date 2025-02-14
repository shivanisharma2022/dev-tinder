const Redis = require("ioredis");
require("dotenv").config();

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  // password: "your_password",
  // db: 0,
};

try {
  const redis = new Redis(redisConfig);
  console.log("Redis connection established");

  redis.set("mykey", "value");

  redis.get("mykey", (err, result) => {
    if (err) {
      console.error("Error getting value from Redis:", err);
    } else {
      console.log("Value retrieved from Redis:", result);
    }
  });

  module.exports = redis;
} catch (error) {
  console.error("Error connecting to Redis:", error);
}









// const redis = require('redis');
// require("dotenv").config();
// console.log('Attempting to connect to Redis...');
// try {
//   const redisClient = redis.createClient({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     debug_mode: true
//   });
//   console.log('Redis client created');
//   redisClient.on('connect', () => {
//     console.log('============ Connected to Redis =============');
//   });

//   redisClient.on('ready', () => {
//     console.log('============ Redis client is ready =============');
//     redisClient.ping((err, res) => {
//       if (err) {
//         console.log('====== Redis ping error: =======', err);
//       } else {
//         console.log('====== Redis connection established and ping successful =======');
//       }
//     });
//   });

//   redisClient.on('error', (err) => {
//     console.log('====== Redis error: =======', err);
//   });

//   redisClient.on('end', () => {
//     console.log('====== Redis connection closed =======');
//   });

//   module.exports = redisClient;
// } catch (err) {
//   console.log('======= Error creating Redis client: =======', err);
//   process.exit(1);
// }

// const redis = require('redis');
// const client = redis.createClient();
// console.log('Attempting to connect to Redis...', client);

// client.on('connect', function() {
//   console.log('Connected!');
// });

// client.on('error', function(err) {
//   console.log('Error:', err);
// });

// client.connect( );
