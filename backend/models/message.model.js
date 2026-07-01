const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            trim: true
        },

        sender: {
            type: String,
            required: true
        },

        message: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Message", messageSchema);