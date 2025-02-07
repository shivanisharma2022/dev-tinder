const express = require("express");
const authRouter = express.Router(); // same as const app = express();
const User = require("../models/user");
const { validateSignupData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");
const nodemailer = require("nodemailer");
const { run } = require('../utils/sendEmail');
const Handlebars = require("handlebars");
const forgotPasswordTemplate = require('../utils/forgotPassword.html');
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
      return res.status(400).json({ error: "Email already exists" });
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
    res.status(err?.status || 400).send(err?.message || "Error in sendOtp: " + err.message);
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
    res.status(err?.status || 400).send(err?.message || "Error in verifyOtp: " + err.message);
  }
});

authRouter.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = process.env.JWT + user.password;
    const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: '1h' });

    const resetURL = `${process.env.WEBSITE_URL}resetpassword?id=${user._id}&token=${token}`;

    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: 
    //     pass: 
    //   },
    // });

    // const mailOptions = {
    //   to: process.env.SENDER_EMAIL, //user.email,
    //   from: process.env.RECEIVER_EMAIL,
    //   subject: 'Password Reset Request',
    //   text: forgotPasswordTemplate(resetURL)
    // };

    // await transporter.sendMail(mailOptions);

    const subject = 'Password Reset Request';

    const template = Handlebars.compile(forgotPasswordTemplate);
    const data = {
      WEBSITE_URL: process.env.WEBSITE_URL,
      resetURL: resetURL,
      SENDER_EMAIL: process.env.SENDER_EMAIL
    };
    const html = template(data);
    await run(subject, html);
    res.status(200).json({ message: 'Password reset link sent', data: token });
  } catch (err) {
    res.status(400).send("Error in forgotPassword: " + err.message);
  }
});

authRouter.post("/resetPassword", async (req, res) => {
  try {
    const { id, token } = req.query;
    const { password } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const secret = process.env.JWT + user.password;
    jwt.verify(token, secret);

    const encryptedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await User.findByIdAndUpdate(id, { password: encryptedPassword }, { new: true });
    res.status(200).json({ message: 'Password has been reset', data: updatedUser });
  } catch (err) {
    res.status(400).send("Error in resetPassword: " + err.message);
  }
});

authRouter.post("/changePassword", userAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    const isValidOldPassword = await bcrypt.compare(oldPassword, req.user.password);
    if (!isValidOldPassword) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    const isNewPasswordSameAsOld = await bcrypt.compare(newPassword, req.user.password);
    if (isNewPasswordSameAsOld) {
      return res.status(400).json({ message: "New password cannot be the same as old password" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    const user = await User.findByIdAndUpdate(userId, {
      password: await bcrypt.hash(newPassword, 10)
    }, {
      new: true,
      runValidators: true //ensure that the new password is validated before it's saved to the db
    });

    res.status(200).json({ message: "Password changed successfully", data: user });
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
