// Auth Controller
const User = require('../models/User');

function loginOrRegister(req, res) {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanName = username.trim();
  let user = User.findByUsername(cleanName);
  if (!user) {
    user = User.createOrUpdate(cleanName, { createdAt: new Date().toISOString() });
  }

  return res.json({ success: true, user });
}

module.exports = {
  loginOrRegister
};
