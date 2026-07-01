const Room = require("../models/room.model");

const createRoom = async (req, res) => {

    try {

        const { roomName } = req.body;
        const createdBy = req.user?.username;

        if (!roomName || !createdBy) {
            return res.status(400).json({
                success: false,
                message: "Room name is required"
            });
        }

        const room = await Room.create({
            roomName,
            createdBy
        });

        res.status(201).json({
            success: true,
            room
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getRooms = async (req, res) => {

    try {

        const rooms = await Room.find().sort({
            createdAt: -1
        });

        res.json({
            success: true,
            rooms
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    createRoom,
    getRooms
};