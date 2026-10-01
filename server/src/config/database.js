// Database Configuration & In-Memory Storage Adapter

class DatabaseStore {
  constructor() {
    this.users = new Map(); // username -> User
    this.scores = [];       // List of Score records
    this.words = [
      { id: '1', word: 'Apple', category: 'Food', difficulty: 'easy' },
      { id: '2', word: 'Cat', category: 'Animal', difficulty: 'easy' },
      { id: '3', word: 'House', category: 'Object', difficulty: 'easy' },
      { id: '4', word: 'Car', category: 'Vehicle', difficulty: 'easy' },
      { id: '5', word: 'Tree', category: 'Nature', difficulty: 'easy' },
      { id: '6', word: 'Sun', category: 'Space', difficulty: 'easy' },
      { id: '7', word: 'Pizza', category: 'Food', difficulty: 'medium' },
      { id: '8', word: 'Airplane', category: 'Vehicle', difficulty: 'medium' },
      { id: '9', word: 'Elephant', category: 'Animal', difficulty: 'medium' },
      { id: '10', word: 'Bicycle', category: 'Vehicle', difficulty: 'medium' },
      { id: '11', word: 'Guitar', category: 'Instrument', difficulty: 'medium' },
      { id: '12', word: 'Computer', category: 'Technology', difficulty: 'hard' },
      { id: '13', word: 'Eiffel Tower', category: 'Landmark', difficulty: 'hard' },
      { id: '14', word: 'Astronaut', category: 'Job', difficulty: 'hard' },
      { id: '15', word: 'Helicopter', category: 'Vehicle', difficulty: 'hard' },
      { id: '16', word: 'Submarine', category: 'Vehicle', difficulty: 'hard' },
      { id: '17', word: 'Dragon', category: 'Fantasy', difficulty: 'medium' },
      { id: '18', word: 'Rainbow', category: 'Nature', difficulty: 'easy' },
      { id: '19', word: 'Clock', category: 'Object', difficulty: 'easy' },
      { id: '20', word: 'Basketball', category: 'Sport', difficulty: 'easy' }
    ];

    // Initialize default seed users and sample leaderboard data
    this.seedInitialData();
  }

  seedInitialData() {
    const defaultUsers = [
      { username: 'SpeedyArtist', totalScore: 2450, gamesPlayed: 12, wins: 5 },
      { username: 'PixelMaster', totalScore: 1980, gamesPlayed: 10, wins: 4 },
      { username: 'SketchPro', totalScore: 1650, gamesPlayed: 8, wins: 3 },
      { username: 'QuickGuesser', totalScore: 1420, gamesPlayed: 7, wins: 2 },
      { username: 'ColorWhiz', totalScore: 1100, gamesPlayed: 5, wins: 1 }
    ];

    defaultUsers.forEach(u => {
      this.users.set(u.username, u);
      this.scores.push({
        id: Math.random().toString(36).substr(2, 9),
        username: u.username,
        score: u.totalScore,
        gameMode: 'MULTIPLAYER_FFA',
        date: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)).toISOString()
      });
    });
  }

  getUser(username) {
    return this.users.get(username) || null;
  }

  saveUser(username, data = {}) {
    let user = this.getUser(username);
    if (!user) {
      user = { username, totalScore: 0, gamesPlayed: 0, wins: 0, createdAt: new Date().toISOString() };
    }
    Object.assign(user, data);
    this.users.set(username, user);
    return user;
  }

  addScoreRecord(username, score, gameMode) {
    // Note: SRS 2.2 states scores from Solo AI mode will NOT be saved to total leaderboard
    if (gameMode === 'SOLO_AI') return null;

    const record = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      score,
      gameMode,
      date: new Date().toISOString()
    };
    this.scores.push(record);

    // Update user stats
    const user = this.saveUser(username);
    user.totalScore = (user.totalScore || 0) + score;
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;

    return record;
  }

  getLeaderboard(gameMode = null, limit = 10) {
    let filtered = [...this.scores];
    if (gameMode) {
      filtered = filtered.filter(s => s.gameMode === gameMode);
    }
    
    // Group by username to get highest / accumulated scores
    const userTotals = {};
    filtered.forEach(s => {
      if (!userTotals[s.username]) {
        userTotals[s.username] = { username: s.username, totalScore: 0, gamesCount: 0, lastPlayed: s.date };
      }
      userTotals[s.username].totalScore += s.score;
      userTotals[s.username].gamesCount += 1;
    });

    const leaderboardList = Object.values(userTotals)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    return leaderboardList;
  }

  getRandomWords(count = 3) {
    const shuffled = [...this.words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

const db = new DatabaseStore();

module.exports = db;
