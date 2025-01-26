const express = require("express");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { razorpayInstance } = require('../utils/razorpay');
const Payment = require("../models/payment");
const { membershipAmount } = require("../utils/constant");
const User = require("../models/user");
const { validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
    try {
        const { membershipType } = req.body; // for amount never rely on FE, always take amount from BE
        const { firstName, lastName, email } = req.user;
        // making an call to razorpay instance
        const order = await razorpayInstance.orders.create({
            "amount": membershipAmount[membershipType] * 100,  // here if refers to paisa, it considers the lowest currency of specified currency
            "currency": 'INR',
            "receipt": 'receipt#1',
            "notes": {
                firstName,
                lastName,
                email,
                membershipType: membershipType
            }
        })

        // Save it in my db
        console.log("order", order)
        const payment = new Payment({
            userId: req.user._id,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            notes: order.notes
        });

        const savedPayment = await payment.save();


        // return my order deatils to FE

        res.json({ ...savedPayment.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });

    } catch (err) {
        res.status(400).send("Error creating the payment: " + err.message);
    }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
    try {
        const webhookSignature = req.headers('X-Razorpay-Signature');
        const isWebhookValid = validateWebhookSignature(
            JSON.stringify(req.body),
            webhookSignature,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isWebhookValid) {
            return res.status(400).send({ msg: "Webhook signature is invalid" });
        }

        // update my payment status in db

        const paymentDetails = req.body.payload.payment.entity;
        const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
        payment.status = paymentDetails.status;
        await payment.save();

        // update user as premium

        const user = await User.findById(payment.userId);
        user.isPremium = true;
        user.membershipType = payment.notes.membershipType;
        await user.save();

        // if (req.body.event === 'payment.captured') {
        // }

        // if (req.body.event === 'payment.failed') {
        // }

        // return success response to razorpay
        return res.status(200).json({ msg: "Webhook received successfully" });
    } catch (err) {
        res.status(500).send({ msg: err.message });
    }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
    try {
        const user = req.user.JSON();
        if (user.isPremium) {
            //return res.json({ isPremium: true });
            return res.json({ ...user });
        } else {
            // return res.json({ isPremium: false });
            return res.json({ ...user });
        }
    } catch (err) {
        res.status(500).send({ msg: err.message });
    }
})

module.exports = { paymentRouter };