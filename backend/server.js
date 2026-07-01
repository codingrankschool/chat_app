require("dotenv").config();
const authRoutes = require("./routes/auth.route");
const roomRoutes = require("./routes/room.route");
const userRoutes = require("./routes/user.route");
const socketHandler = require("./sockets/socket");
const messageRoutes = require("./routes/message.route");

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db.config");

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Chat Backend Running..."
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

socketHandler(io);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
});