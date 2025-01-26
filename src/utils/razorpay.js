const Razorpay = require("razorpay");
require("dotenv").config();

var razorpayInstance = new Razorpay({ // this will initialize our razorpay
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})

module.exports = {razorpayInstance};