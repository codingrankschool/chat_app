const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { searchUsers } = require('../controllers/userController.controller');

router.get('/search', authMiddleware, searchUsers);

module.exports = router;
