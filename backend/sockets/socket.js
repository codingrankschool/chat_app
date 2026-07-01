const Message = require("../models/message.model");
const jwt = require("jsonwebtoken");

const normalizeRoomId = (roomId) => String(roomId ?? "").trim();

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

            const nextRoomId = normalizeRoomId(roomId);

            if (!nextRoomId) return;

            if (socket.roomId && socket.roomId !== nextRoomId) {
                socket.leave(socket.roomId);
            }

            socket.join(nextRoomId);

            socket.roomId = nextRoomId;

            console.log(`${socket.user.username} joined ${nextRoomId}`);

            socket.to(nextRoomId).emit("user-joined", {
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

            const nextRoomId = normalizeRoomId(roomId);

            if (!nextRoomId) return;

            socket.to(nextRoomId).emit("typing", {
                username: socket.user.username
            });

        });

        /*
        =============================
        Typing Stop
        =============================
        */

        socket.on("stop-typing", ({ roomId }) => {

            const nextRoomId = normalizeRoomId(roomId);

            if (!nextRoomId) return;

            socket.to(nextRoomId).emit("stop-typing");

        });

        /*
        =============================
        Send Message
        =============================
        */

        socket.on("send-message", async (data) => {

            try {

                const roomId = normalizeRoomId(data?.roomId);
                if (!roomId || !data?.message) return;

                const newMessage = await Message.create({
                    roomId,
                    sender: socket.user.username,
                    message: data.message
                });

                io.to(roomId).emit("receive-message", newMessage);

            } catch (error) {

                console.log(error.message);

            }

        });

        socket.on("leave-room", ({ roomId }) => {
            const nextRoomId = normalizeRoomId(roomId);

            if (nextRoomId) {
                socket.leave(nextRoomId);
                socket.to(nextRoomId).emit("user-left", {
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