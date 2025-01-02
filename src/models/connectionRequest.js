const mongoose = require("mongoose");
const connectionRequestSchema = new mongoose.Schema(
  { // when we want to do 2 indexes it's called compound index
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // reference to user model
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  {
    timestamps: true,
  }
);

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 }); //-1 for DESC

connectionRequestSchema.pre("save", async function (next) {//this thing acts a middleware, will be executed before save is called in route
  const connectionRequest = this;
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) { // can also write it in the route, in easy way, 
    throw new Error("Cannot send connection request to yourself");
  }
  next();
});

const ConnectionRequest = new mongoose.model( "ConnectionRequest",connectionRequestSchema);
module.exports = { ConnectionRequest };
