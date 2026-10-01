// User Model Interface
const db = require('../config/database');

class User {
  static findByUsername(username) {
    return db.getUser(username);
  }

  static createOrUpdate(username, data) {
    return db.saveUser(username, data);
  }
}

module.exports = User;
