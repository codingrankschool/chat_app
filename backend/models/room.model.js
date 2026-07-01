const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        createdBy: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Room", roomSchema);