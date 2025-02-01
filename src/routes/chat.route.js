const express = require("express");
const chatRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { Chat } = require("../models/chat");

// Get list of past chats
chatRouter.get("/chat/list", userAuth, async (req, res) => {
    try {
        const userId = req.user._id; // Logged-in user ID

        // Aggregation to fetch the latest message per chat
        const chats = await Chat.aggregate([
            { $match: { participants: userId } }, // Filter chats where user is a participant
            { $unwind: "$messages" }, // Flatten messages array
            { $sort: { "messages.createdAt": -1 } }, // Sort messages by latest
            { 
                $group: { 
                    _id: "$_id", 
                    lastMessage: { $first: "$messages" }, // Get the latest message per chat
                    participants: { $first: "$participants" }, 
                    updatedAt: { $first: "$updatedAt" } // Maintain sort order
                } 
            },
            { $sort: { updatedAt: -1 } }, // Sort chats by last updated
        ]);

        // Populate user details manually
        const populatedChats = await Chat.populate(chats, {
            path: "participants",
            select: "firstName lastName imageUrl",
        });

        // Transform chat data for frontend
        const chatList = populatedChats.map((chat) => {
            const targetUser = chat.participants.find(p => p._id.toString() !== userId.toString());

            return {
                targetUser: targetUser
                    ? {
                        _id: targetUser._id,
                        firstName: targetUser.firstName,
                        lastName: targetUser.lastName,
                        imageUrl: targetUser.imageUrl,
                    }
                    : null,
                lastMessage: chat.lastMessage
                    ? {
                        text: chat.lastMessage.text,
                        createdAt: chat.lastMessage.createdAt,
                    }
                    : { text: "No messages yet", createdAt: null },
            };
        });

        res.status(200).json(chatList);

    } catch (err) {
        console.error("Error fetching chat list:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const userId = req.user._id;

        let chat = await Chat.findOne({
            participants: { $all: [userId, targetUserId] },
        }).populate({
            path: 'participants',
            select: 'firstName lastName imageUrl',  //Ensure full user details
        }).populate({
            path: 'messages.senderId',
            select: 'firstName lastName imageUrl',
        });
        if (!chat) {
            chat = new Chat({
                participants: [userId, targetUserId],
                messages: [],
            });
        }
        await chat.save();
        return res.status(201).json(chat);
    } catch (err) {
        res.status(400).send("Error finding the chat: " + err.message);
    }
});

module.exports = { chatRouter };