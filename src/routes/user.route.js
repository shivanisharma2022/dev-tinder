const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { ConnectionRequest } = require("../models/connectionRequest");
const User = require("../models/user");

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", ["firstName", "lastName", "imageUrl"]);

    res.json({
      message: "Connection requests received",
      data: connectionRequests,
    });
  } catch (err) {
    res.status(400).send("Error" + err.message);
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "accepted" },
        { toUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", ["firstName", "lastName", "imageUrl"])
      .populate("toUserId", ["firstName", "lastName", "imageUrl"]);

    const data = await connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() == loggedInUser._id.toString()) {
        // check if fromUserId is same as loggedInUser
        return row.toUserId; // return toUserId
      }
      return row.fromUserId; // return fromUserId
    });
    res.json({
      message: "Connections found",
      data: data,
    });
  } catch (err) {
    res.status(400).send("Error" + err.message);
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    // User should see all the user cards except
    // 1. his own card
    // 2. his connections
    // 3. ignored people
    // 4. already sent the connection request

    const loggedInUser = req.user;
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit; // limiting the data, if attacker sends limit = 1lakh db will be freezed
    const skip = (page - 1) * limit;

    // find all connection requests for loggedInUser(sent + received)
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId toUserId"); // to return only these fields in response

    //so now we have to not show the above users in the feed i.e, we have to hide them

    const hideUsersFromFeed = new Set(); // a data structure, which stores non-repeating values
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    // users that now I want to show on feed page
    const users = await User.find({
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select("firstName lastName age imageUrl gender description skills")
      .skip(skip)
      .limit(limit); // by default skip is 0

    const result = { page: page, limit: limit, data: users };
    res.json({ message: "Feed found", data: result });
  } catch (err) {
    res.status(400).send("Error" + err.message);
  }
});

module.exports = { userRouter };
