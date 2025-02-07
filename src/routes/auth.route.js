const express = require("express");
const authRouter = express.Router(); // same as const app = express();
const User = require("../models/user");
const { validateSignupData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");
require("dotenv").config();
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_ID } = process.env;
const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
  lazyLoading: true
});

authRouter.post("/signup", async (req, res) => {
  try {
    // Validation of data is required first
    validateSignupData(req);
    // encryption of password and then storing it in db
    const { firstName, lastName, phone, email, password } = req.body;

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists. Please login instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // creating a new instance of the User model
    //const user = new User(req.body); // bad way
    const user = new User({
      firstName,
      lastName,
      phone,
      email,
      password: passwordHash,
    });
    const userNew = await user.save();
    const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 360000),
    });
    res.send({ message: "User Added Successfully", data: userNew });
  } catch (err) {
    res.status(400).send("Error saving the user: " + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    //const isPasswordValid = user.validatePassword(password);
    if (isPasswordValid) {
      // create a jwt token
      const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      //const token = await user.getJWT(); // will get the current user jwt token
      console.log(token);
      // add token to cookie and send response back to user
      res.cookie("token", token);
      res.send({ message: "Login Successful", data: user });
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (err) {
    res.status(400).send("Error logging in: " + err.message);
  }
});

authRouter.post("/sendOtp", async (req, res) => {
  try {
    const { countryCode, phone } = req.body;
    const otpResponse = await client.verify.v2
      .services(TWILIO_SERVICE_ID)
      .verifications.create({
        to: `+${countryCode}${phone}`,
        channel: "sms",
      });
    res.status(200).json({ message: "OTP Sent Successfully", data: otpResponse });
  } catch (err) {
    res.status(err?.status || 400 ).send(err?.message || "Error in sendOtp: " + err.message);
  }
});

authRouter.post("/verifyOtp", async (req, res) => {
  try {
    const { countryCode, phone, otp } = req.body;
    // Bypass OTP verification for testing
    if (otp === '123456') {
      res.status(200).json({ message: "OTP Verified Successfully" });
    } else {
      const otpResponse = await client.verify.v2
        .services(TWILIO_SERVICE_ID)
        .verificationChecks.create({
          to: `+${countryCode}${phone}`,
          code: otp,
          channel: 'sms',
        });
        if (otpResponse.status === 'approved') {
        res.status(200).json({ message: "OTP Verified Successfully", data: otpResponse });
      } else {
        res.status(400).send({ message: "Invalid OTP" });
      }
    }
  } catch (err) {
    res.status(err?.status || 400 ).send(err?.message || "Error in verifyOtp: " + err.message);
  }
});

authRouter.post("/forgotPassword", async (req, res) => {
  try {

  } catch (err) {
    res.status(400).send("Error in forgotPassword: " + err.message);
  }
});

authRouter.post("/resetPassword", async (req, res) => {
  try {

  } catch (err) {
    res.status(400).send("Error in resetPassword: " + err.message);
  }
});

authRouter.post("/changePassword", async (req, res) => {
  try {

  } catch (err) {
    res.status(400).send("Error in changePassword: " + err.message);
  }
});

authRouter.post("/completeProfile", userAuth, async (req, res) => {
  try {
    const payload = {
      gender: req.body.gender,
      age: req.body.age,
      description: req.body.description,
      skills: req.body.skills,
    }
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true });
    res.send({ message: "Profile Updated Successfully", data: updatedUser });
  } catch (err) {
    res.status(400).send("Error in completeProfile: " + err.message);
  }
});

authRouter.use("/logout", async (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  res.send("Logout Successfully");
});

module.exports = { authRouter };
