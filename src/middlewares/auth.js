const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
    try {
        //const token = req.cookies.token;
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).send("Unauthorized, Please login!");
        }
        const decoded = await jwt.verify(token, "dev@tinder$3000", {expiresIn: '1h'});
        const { _id } = decoded;
        const user = await User.findById(_id);
        if (!user) {
            throw new Error("User not found");
        }
        req.user = user; // this will attach the user to the request if user is found, then we do not need to do it in the route
        next();  // if token is valid, then only it will go inside the code i.e, async inside route
    } catch (err) {
        res.status(401).send("Unauthorized");
    }
};

module.exports = { userAuth };