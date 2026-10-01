// Leaderboard Controller
const Score = require('../models/Score');

function getLeaderboard(req, res) {
  const { gameMode, limit } = req.query;
  const numLimit = limit ? parseInt(limit, 10) : 10;
  
  const leaderboard = Score.getTopLeaderboard(gameMode || null, numLimit);
  return res.json({ success: true, leaderboard });
}

module.exports = {
  getLeaderboard
};
