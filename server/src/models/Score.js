// Score Model Interface
const db = require('../config/database');

class Score {
  static addRecord(username, score, gameMode) {
    return db.addScoreRecord(username, score, gameMode);
  }

  static getTopLeaderboard(gameMode, limit = 10) {
    return db.getLeaderboard(gameMode, limit);
  }
}

module.exports = Score;
