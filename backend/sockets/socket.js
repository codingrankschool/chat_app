const Message = require("../models/message.model");
const jwt = require("jsonwebtoken");

const socketHandler = (io) => {

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication error"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
            if (error) {
                return next(new Error("Authentication error"));
            }

            socket.user = decoded;
            next();
        });
    });

    io.on("connection", (socket) => {

        console.log("User Connected :", socket.id, socket.user.username);

        /*
        =============================
        Join Room
        =============================
        */

        socket.on("join-room", ({ roomId }) => {

            socket.join(roomId);

            socket.roomId = roomId;

            console.log(`${socket.user.username} joined ${roomId}`);

            socket.to(roomId).emit("user-joined", {
                username: socket.user.username,
                message: `${socket.user.username} joined the room`
            });

        });

        /*
        =============================
        Typing Start
        =============================
        */

        socket.on("typing", ({ roomId }) => {

            socket.to(roomId).emit("typing", {
                username: socket.user.username
            });

        });

        /*
        =============================
        Typing Stop
        =============================
        */

        socket.on("stop-typing", ({ roomId }) => {

            socket.to(roomId).emit("stop-typing");

        });

        /*
        =============================
        Send Message
        =============================
        */

        socket.on("send-message", async (data) => {

            try {

                const newMessage = await Message.create({
                    roomId: data.roomId,
                    sender: socket.user.username,
                    message: data.message
                });

                io.to(data.roomId).emit("receive-message", newMessage);

            } catch (error) {

                console.log(error.message);

            }

        });

        socket.on("leave-room", ({ roomId }) => {
            if (roomId) {
                socket.leave(roomId);
                socket.to(roomId).emit("user-left", {
                    username: socket.user.username,
                    message: `${socket.user.username} left the room`
                });
            }
        });

        /*
        =============================
        Disconnect
        =============================
        */

        socket.on("disconnect", () => {

            console.log("User Disconnected");

            if (socket.roomId) {

                socket.to(socket.roomId).emit("user-left", {

                    username: socket.user?.username,

                    message: `${socket.user?.username || 'A user'} left the room`

                });

            }

        });

    });

};

module.exports = socketHandler;