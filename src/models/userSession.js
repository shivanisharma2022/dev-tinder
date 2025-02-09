const mongoose = require("mongoose");
const { COLLECTION } = require("../utils/constant");
const userSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: COLLECTION.USER,
            index: true,
        },
        deviceId: { type: String, required: true },
        deviceToken: { type: String },
        deviceType: { type: String },
    },
    {
        versionKey: false,
        //collection: COLLECTION.USER_SESSION,
        timestamps: true,
    }
)

const UserSession = mongoose.model("UserSession", userSessionSchema);
module.exports = { UserSession };