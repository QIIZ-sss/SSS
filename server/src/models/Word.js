// Word Model Interface
const db = require('../config/database');

class Word {
  static getRandomWords(count = 3) {
    return db.getRandomWords(count);
  }
}

module.exports = Word;
