const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

const {
    getMessages
} = require("../controllers/messageController.controller");

router.get("/:roomId", authMiddleware, getMessages);

module.exports = router;