const express = require("express");
const authRouter = express.Router(); // same as const app = express();
const User = require("../models/user");
const UserSession = require("../models/userSession");
const { validateSignupData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { basicAuth, userAuth } = require("../middlewares/auth");
const nodemailer = require("nodemailer");
const { run } = require('../utils/sendEmail');
const Handlebars = require("handlebars");
const forgotPasswordTemplate = require('../utils/forgotPassword.html');
const otpEmailTemplate = require('../utils/emailOtp.html');
const { generateRandomCode } = require("../utils/constant");
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const { generateUploadUrl, generateDownloadUrl } = require('../utils/pre-signedUrl');
const { sendPushNotification } = require('../firebase/firebase');
const notificationMessages = require('../utils/notification');

require("dotenv").config();

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_ID } = process.env;
const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
  lazyLoading: true
});

authRouter.post("/signup", basicAuth, async (req, res) => {
  try {
    // Validation of data is required first
    validateSignupData(req);
    // encryption of password and then storing it in db
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerify.isVerified === true) {
      throw new Error("This email address is already associated with an account.");
    }
    const { firstName, lastName, phone, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      phone: `+91${phone}`,
      email,
      password: passwordHash,
    });
    const userNew = await user.save();

    const sessionId = uuidv4();
    const sessionDataRedis = {
      userId: userNew._id,
      deviceId: req.headers["device-id"] || " ",
      deviceToken: req.headers["device-token"] || " ",
      deviceType: req.headers["device-type"] || " ",
    };

    await redis.hmset(`session:${sessionId}`, sessionDataRedis);

    const sessionPayload = new UserSession( {
      userId: userNew._id,
      deviceId: req.headers["device-id"] || " ",
      deviceToken: req.headers["device-token"] || " ",
      deviceType: req.headers["device-type"] || " ",
    });

    const sessionData = await sessionPayload.save();

    const token = await jwt.sign(
      { _id: userNew._id, sessionId: sessionDataRedis._id, deviceId: sessionDataRedis.deviceId },
      process.env.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );
    res.send({ message: "User Added Successfully", data: { token: token, data: userNew } });
  } catch (err) {
    res.status(400).send("Error saving the user: " + err.message);
  }
});

authRouter.post("/login", basicAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    const userSessionData = await UserSession.findOne({ userId: user._id });
    if (!user || user.emailVerify.isVerified === false) {
      throw new Error("Email does not exist. Please create an account.");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    await redis.del(`session:${user._id}`);
    await UserSession.deleteMany({ userId: user._id });

    //await UserSession.deleteMany({ userId: user._id });

    const sessionPayload = new UserSession( {
      userId: user._id,
      deviceId: req.headers["device-id"] || " ",
      deviceToken: req.headers["device-token"] || " ",
      deviceType: req.headers["device-type"] || " ",
    });
    const sessionDataDB = await sessionPayload.save();

    const sessionId = sessionDataDB._id;
    const sessionData = {
      userId: user._id,
      deviceId: req.headers["device-id"] || " ",
      deviceToken: req.headers["device-token"] || " ",
      deviceType: req.headers["device-type"] || " ",
    };

    await redis.hmset(`session:${sessionId}`, sessionData);
    await redis.expire(`session:${user._id}`, 3600);

    const token = await jwt.sign(
      { _id: user._id, sessionId: sessionDataDB._id, deviceId: sessionDataDB.deviceId },
      process.env.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256"  }
    );

    console.log("Going to send push notification >>>>>>>>>>>>>>>>")

    await sendPushNotification(userSessionData.deviceToken, notificationMessages.login(user.firstName));
    res.send({ message: "Login Successful", data: { token: token, data: user } });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

authRouter.post("/sendOtpEmail", basicAuth, async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const otpCode = generateRandomCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const updateUser = await User.findOneAndUpdate(
      { email: req.body.email },
      { $set: { "emailVerify.otp": otpCode, "emailVerify.expiresAt": expiresAt } },
      { new: true }
    );
    const subject = "DevTinder Email Verification";
    const template = Handlebars.compile(otpEmailTemplate);
    const data = {
      OTP_CODE: otpCode,
      SENDER_EMAIL: process.env.SENDER_EMAIL
    };
    const html = template(data);
    await run(subject, html);
    res.status(200).json({ message: "Verification Code Sent on Email Successfully" });
  } catch (err) {
    res.status(400).send("Error in sendCodeEmail: " + err.message);
  }
});

authRouter.post("/verifyEmail", basicAuth, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Bypass OTP verification for testing
    if (otp === '123456') {
      const updatedUser = await User.findOneAndUpdate(
        { email: req.body.email },
        { $set: { "emailVerify.isVerified": true } },
        { sort: { updatedAt: -1 }, new: true }
      );
      await User.deleteMany({ email: req.body.email, _id: { $ne: updatedUser._id } });
      res.status(200).json({ message: "Email Verified Successfully" });
    } else {
      if (parseInt(user.emailVerify.otp) !== parseInt(otp)) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      if (user.emailVerify.expiresAt < new Date()) {
        return res.status(400).json({ message: "OTP has expired" });
      }
      const updatedUser = await User.findOneAndUpdate(
        { email: req.body.email },
        { $set: { "emailVerify.isVerified": true } },
        { sort: { updatedAt: -1 }, new: true }
      );
      await User.deleteMany({ email: req.body.email, _id: { $ne: updatedUser._id } });
      res.status(200).json({ message: "Email Verified Successfully" });
    }
  } catch (err) {
    res.status(400).send("Error in verifyEmail: " + err.message);
  }
});

authRouter.post("/sendOtp", basicAuth, async (req, res) => {
  try {
    const { countryCode, phone } = req.body;
    const existingUser = await User.findOne({ phone: `+${countryCode}${phone}` });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //Send the OTP using Twilio
    const otpResponse = await client.verify.v2
      .services(TWILIO_SERVICE_ID)
      .verifications.create({
        to: `+${countryCode}${phone}`,
        channel: "sms",
      });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await User.findOneAndUpdate(
      { phone: `+${countryCode}${phone}` },
      { $set: { "phoneVerify.otp": 123456, "phoneVerify.expiresAt": expiresAt } },
      { new: true }
    );

    // // Generate a new OTP and update the user's document
    // const otpCode = generateRandomCode();
    // const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // await User.findOneAndUpdate(
    //   { phone: `+${countryCode}${phone}` },
    //   { $set: { "phoneVerify.otp": otpCode, "phoneVerify.expiresAt": expiresAt } },
    //   { new: true }
    // );
    // const message = `This is your verification code: ${otpCode}. This is valid for 10 minutes only.`;
    // const otpResponse = await client.messages
    //   .create({
    //     body: message,
    //     from: TWILIO_PHONE_NUMBER,
    //     to: `+${countryCode}${phone}`,
    //   })
    //   .then((message) => {
    //     console.log(message.sid);
    //   })
    //   .done();
    res.status(200).json({ message: "OTP Sent Successfully" });
  } catch (err) {
    res.status(err?.status || 400).send(err?.message || "Error in sendOtp: " + err.message);
  }
});

authRouter.post("/verifyOtp", basicAuth, async (req, res) => {
  try {
    const { countryCode, phone, otp } = req.body;
    const existingUser = await User.findOne({ phone: `+${countryCode}${phone}` });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Bypass OTP verification for testing
    if (otp === '123456') {
      const updatedUser = await User.findOneAndUpdate(
        { phone: `+${countryCode}${phone}` },
        { $set: { "phoneVerify.isVerified": true } },
        { sort: { updatedAt: -1 }, new: true }
      );
      await User.deleteMany({ phone: `+${countryCode}${phone}`, _id: { $ne: updatedUser._id } });
      const token = await jwt.sign({ _id: updatedUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.status(200).json({ message: "OTP Verified Successfully", data: { userId: updatedUser._id, token: token } });
    }
    // else {
    //   if (existingUser.phoneVerify.otp !== otp) {
    //     return res.status(400).json({ message: "Invalid OTP" });
    //   }
    //   if (existingUser.phoneVerify.expiresAt < new Date()) {
    //     return res.status(400).json({ message: "OTP has expired" });
    //   }
    //   const updatedUser = await User.findOneAndUpdate(
    //     { phone: `+${countryCode}${phone}` },
    //     { $set: {"phoneVerify.isVerified": true } },
    //     { sort: { updatedAt: -1 }, new: true }
    //   );
    //   await User.deleteMany({ phone: `+${countryCode}${phone}`, _id: { $ne: updatedUser._id } });
    //   const token = await jwt.sign({ _id: updatedUser._id }, process.env.JWT_SECRET, {expiresIn: "1h"});
    //   res.status(200).json({ message: "OTP Verified Successfully", data: {userId: updatedUser._id, token: token} });
    // }
    else {
      // Twilio OTP Verification
      const otpResponse = await client.verify.v2
        .services(TWILIO_SERVICE_ID)
        .verificationChecks.create({
          to: `+${countryCode}${phone}`,
          code: otp,
          channel: 'sms',
        });
      if (otpResponse.status === 'approved') {
        const updatedUser = await User.findOneAndUpdate(
          { phone: `+${countryCode}${phone}` },
          { $set: { "phoneVerify.isVerified": true } },
          { sort: { updatedAt: -1 }, new: true }
        );
        await User.deleteMany({ phone: `+${countryCode}${phone}`, _id: { $ne: updatedUser._id } });
        //const token = await jwt.sign({ _id: updatedUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({ message: "OTP Verified Successfully", data: { userId: updatedUser._id } });
      }
    }
  } catch (err) {
    res.status(err?.status || 400).send(err?.message || "Error in verifyOtp: " + err.message);
  }
});

authRouter.post("/resendOtp", basicAuth, async (req, res) => {
  try {
    const { countryCode, phone } = req.body;
    const existingUser = await User.findOne({ phone: `+${countryCode}${phone}` });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if the user has already verified their phone number
    if (existingUser.phoneVerify.isVerified) {
      return res.status(400).json({ message: "Phone number is already verified" });
    }
    // Check if the OTP has expired
    if (existingUser.phoneVerify.expiresAt < new Date()) {

      // Send the OTP using Twilio
      const otpResponse = await client.verify.v2
        .services(TWILIO_SERVICE_ID)
        .verifications.create({
          to: `+${countryCode}${phone}`,
          channel: "sms",
        });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await User.findOneAndUpdate(
        { phone: `+${countryCode}${phone}` },
        { $set: { "phoneVerify.otp": 123456, "phoneVerify.expiresAt": expiresAt } },
        { new: true }
      );

      // // Generate a new OTP and update the user's document
      // const otpCode = generateRandomCode();
      // const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      // await User.findOneAndUpdate(
      //   { phone: `+${countryCode}${phone}` },
      //   { $set: { "phoneVerify.otp": otpCode, "phoneVerify.expiresAt": expiresAt } },
      //   { new: true }
      // );
      // const message = `This is your verification code: ${otpCode}. This is valid for 10 minutes only.`;
      // const otpResponse = await client.messages
      //   .create({
      //     body: message,
      //     from: TWILIO_PHONE_NUMBER,
      //     to: `+${countryCode}${phone}`,
      //   })
      //   .then((message) => {
      //     console.log(message.sid);
      //   })
      //   .done();
    } else {
      return res.status(400).json({
        message: "OTP is still valid. You can use the existing OTP to verify your phone number. If you're having trouble with the existing OTP, please wait until it expires before requesting a new one.",
      });
    }
    res.status(200).json({ message: "OTP Sent Successfully" });
  } catch (err) {
    res.status(err?.status || 400).send(err?.message || "Error in resendOtp: " + err.message);
  }
});

authRouter.post("/resendOtpEmail", basicAuth, async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

     // Check if the user has already verified their email
     if (existingUser.emailVerify.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    // Check if the OTP has expired
    if (existingUser.emailVerify.expiresAt < new Date()) {
      
    const otpCode = generateRandomCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const updateUser = await User.findOneAndUpdate(
      { email: req.body.email },
      { $set: { "emailVerify.otp": otpCode, "emailVerify.expiresAt": expiresAt } },
      { new: true }
    );
    const subject = "DevTinder Email Verification";
    const template = Handlebars.compile(otpEmailTemplate);
    const data = {
      OTP_CODE: otpCode,
      SENDER_EMAIL: process.env.SENDER_EMAIL
    };
    const html = template(data);
    await run(subject, html);
  } else {
    return res.status(400).json({
      message: "OTP is still valid. You can use the existing OTP to verify your email. If you're having trouble with the existing OTP, please wait until it expires before requesting a new one.",
    });
  }
    res.status(200).json({ message: "Verification Code Sent on Email Successfully" });
  } catch (err) {
    res.status(400).send("Error in resendOtpEmail: " + err.message);
  }
});

authRouter.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
    res.status(200).json({ message: 'Password reset link sent', data: { token: token } });
  } catch (err) {
    res.status(400).send("Error in forgotPassword: " + err.message);
  }
});

authRouter.post("/resetPassword", async (req, res) => {
  try {
    const { id, token } = req.query;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== id) return res.status(400).json({ message: "Invalid token or id" });

    const user = await User.findOne({ _id: decoded.id });
    if (!user) return res.status(400).json({ message: "User not found" });

    const encryptedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await User.findByIdAndUpdate({ _id: user._id }, { password: encryptedPassword }, { new: true });
    res.status(200).json({ message: 'Password has been reset' });
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

    res.status(200).json({ message: "Password changed successfully" });
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
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: { ...payload, isProfileCompleted: true } }, { new: true });
    res.send({ message: "Profile Updated Successfully" });
  } catch (err) {
    res.status(400).send("Error in completeProfile: " + err.message);
  }
});

authRouter.post("/logout", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await UserSession.deleteMany({ userId: userId });
    await redis.del(`session:${req.user.sessionId}`);

    // const authHeader = req.headers?.authorization;
    // const token = authHeader && authHeader.replace("Bearer ", "");
    //   if (!token) {
    //     return res.status(401).send("Authorization failed. No access token.");
    //   }
    // const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
    // const expirationTime = Math.floor(Date.now() / 1000) + 1;
    // await jwt.sign({ ...decodedToken, exp: expirationTime }, process.env.JWT_SECRET);
    res.status(200).json({ message: "Logout successfully" });
  } catch (err) {
    console.log(err);
    res.status(400).send("Error in logout: " + err.message);
  }
});

authRouter.post('/upload-url', basicAuth, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const url = await generateUploadUrl(fileName, fileType);
    res.send({ url });
  } catch (error) {
    res.status(500).json({ error: 'Error generating upload URL' });
  }
});

authRouter.post('/download-url', basicAuth, async (req, res) => {
  try {
    const { fileName } = req.body;
    const url = await generateDownloadUrl(fileName);
    res.send({ url });
  } catch (error) {
    res.status(500).json({ error: 'Error generating download URL' });
  }
});

module.exports = { authRouter };
