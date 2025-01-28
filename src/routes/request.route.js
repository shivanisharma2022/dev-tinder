const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { ConnectionRequest } = require("../models/connectionRequest");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");

requestRouter.post(
  "/request/send/:status/:userId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.userId;
      const status = req.params.status;

      const allowedStatus = ["interested", "ignored"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid Status" + status });
      }

      //check if fromUserId is not same as toUserId

      const toUserIdExists = await User.findById(toUserId);

      if (!toUserIdExists) {
        return res.status(400).json({ message: "User does not exist" });
      }

      const connectionAlreadyExists = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId },
        ],
      });

      if (connectionAlreadyExists) {
        return res
          .status(400)
          .json({ message: "Connection request already exists" });
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });
      const data = await connectionRequest.save();

      // send email to user

      const emailRes = await sendEmail.run(
        "A new connection request from " + req.user.firstName, 
        req.user.firstName + ' is ' + status + ' in ' + toUserIdExists.firstName
      );

      console.log("Email Response: ", emailRes);

      res.json({
        message: `${req.user.firstName} is ${status} in ${toUserIdExists.firstName}`,
        data: data,
      });
    } catch (err) {
      res
        .status(400)
        .send("Error sendConnectionRequest to the user: " + err.message);
    }
  }
);

requestRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const status = req.params.status;
    const requestId = req.params.requestId;

    const allowedStatus = ["accepted", "rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid Status" + status });
    }

    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: "interested"
    });

    if (!connectionRequest) {
      return res.status(400).json({ message: "Connection request does not exist" });
    }

    connectionRequest.status = status;

    const data = await connectionRequest.save();
    res.json({
      message: `${loggedInUser.firstName} has ${status} the connection request`,
      data: data,
    });

  } catch (err) {
    res.status(400).send("Error getting the user: " + err.message);
  }
});

module.exports = { requestRouter };
