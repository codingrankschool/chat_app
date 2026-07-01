const Message = require("../models/message.model");

const getMessages = async (req, res) => {

    try {

        const { roomId } = req.params;

        const messages = await Message.find({

            roomId

        }).sort({

            createdAt: 1

        });

        res.json({

            success: true,

            messages

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {

    getMessages

};