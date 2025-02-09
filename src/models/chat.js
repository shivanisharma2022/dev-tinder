const mongoose = require("mongoose");
const { COLLECTION } = require("../utils/constant");
const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)

const chatSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        messages: [messageSchema],
    },
    {
        versionKey: false,
        //collection: COLLECTION.CHAT,
        timestamps: true,
    }
)

const Chat = mongoose.model("Chat", chatSchema);
module.exports = { Chat };