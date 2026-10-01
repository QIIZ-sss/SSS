// Word Model Interface
const db = require('../config/database');

class Word {
  static getRandomWords(count = 3, filter = {}) {
    return db.getRandomWords(count, filter);
  }
}

module.exports = Word;
