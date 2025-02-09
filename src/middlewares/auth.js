const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/user");

const basicAuth = (req, res, next) => {
  try {
    const authHeader = req.headers?.["authorization"];
    if (!authHeader) {
      return res.status(401).setHeader("WWW-Authenticate", "Basic").send("Unauthorized");
    }

    const [username, password] = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
    if (username !== process.env.BASIC_AUTH_USERNAME || password !== process.env.BASIC_AUTH_PASSWORD) {
      return res.status(401).setHeader("WWW-Authenticate", "Basic").send("Unauthorized");
    }

    next();
  } catch (err) {
    res.status(401).send("Unauthorized" + err.message);
  }
};
const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    const token = authHeader && authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).send("Authorization failed. No access token.");
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).send("User not found");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send("Unauthorized" + err.message);
  }
};

module.exports = { basicAuth, userAuth };

// const userAuth = async (req, res, next) => {
//     try {
//         //const token = req.cookies.token;
//         const { token } = req.cookies;
//         if (!token) {
//             return res.status(401).send("Unauthorized, Please login!");
//         }
//         const decoded = await jwt.verify(token, "dev@tinder$3000", {expiresIn: '1h'});
//         const { _id } = decoded;
//         const user = await User.findById(_id);
//         if (!user) {
//             throw new Error("User not found");
//         }
//         req.user = user; // this will attach the user to the request if user is found, then we do not need to do it in the route
//         next();  // if token is valid, then only it will go inside the code i.e, async inside route
//     } catch (err) {
//         res.status(401).send("Unauthorized");
//     }
// };