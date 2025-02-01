const express = require("express");
const authRouter = express.Router(); // same as const app = express();
const User = require("../models/user");
const { validateSignupData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");

authRouter.post("/signup", async (req, res) => {
  try {
    // Validation of data is required first
    validateSignupData(req);
    // encryption of password and then storing it in db
    const { firstName, lastName, email, password } = req.body;

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

authRouter.use("/logout", async (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  res.send("Logout Successfully");
});

//   // Delete API - delete user by id in db
// authRouter.delete("/user", userAuth, async (req, res) => {
//     const userId = req.body.userId;
//     try {
//       const user = await User.findByIdAndDelete({ _id: userId });
//       // const user = await User.findOneAndDelete(userId );
//       res.send("User Deleted Successfully");
//     } catch (err) {
//       res.status(400).send("Error deleting the user: " + err.message);
//     }
//   });

module.exports = { authRouter };
