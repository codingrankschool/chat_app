const User = require('../models/user.model');

const searchUsers = async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Search username is required'
      });
    }

    const users = await User.find({
      username: new RegExp(username.trim(), 'i'),
      _id: { $ne: req.user._id }
    })
      .limit(20)
      .select('_id username email');

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  searchUsers
};
