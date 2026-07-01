const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const roomRouter = express.Router();

const {
    createRoom,
    getRooms
} = require("../controllers/roomController.controller");

roomRouter.post("/", authMiddleware, createRoom);
roomRouter.get("/", authMiddleware, getRooms);

module.exports = roomRouter;