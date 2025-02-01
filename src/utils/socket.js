const socket = require("socket.io");
const crypto = require("crypto");
const { Chat } = require("../models/chat");

const getSecretRoomId = (userId, targetUserId) => {
    return crypto
        .createHash("sha256")
        .update([userId, targetUserId].sort().join('$'))
        .digest("hex");
}

const initializeSocket = (server) => {
    const io = socket(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        // handle events
        socket.on('joinChat', ({ firstName, userId, targetUserId }) => {
            const roomId = getSecretRoomId(userId, targetUserId); // create a unique room id for 2 users
            console.log(firstName + ' Joined room', roomId);
            socket.join(roomId);
        });

        socket.on('sendMessage', async ({ firstName, lastName, userId, targetUserId, text }) => {
            // save msg to db 
            try {
                const roomId = getSecretRoomId(userId, targetUserId);
                console.log(firstName + ' ' + text);

                // TODO: check if userId and targetUserId are friends(connectionRequest status is accepted)

                let chat = await Chat.findOne({  // find chat
                    participants: { $all: [userId, targetUserId] },
                })
                if (!chat) { // create chat if not exists
                    chat = new Chat({
                        participants: [userId, targetUserId],
                        messages: [],
                    });
                }
                chat.messages.push({  // add message to chat
                    senderId: userId,
                    text,
                });
                await chat.save();

                // Fetch sender's imageUrl
                const sender = await User.findById(userId).select("imageUrl");

                io.to(roomId).emit('receiveMessage', {
                    firstName,
                    lastName,
                    text,
                    imageUrl: sender?.imageUrl || "",
                });

            } catch (error) {
                console.log(error);
            }
        });


        socket.on('disconnect', () => {
        });
    });
};

module.exports = initializeSocket;
