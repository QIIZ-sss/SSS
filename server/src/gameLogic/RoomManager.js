// RoomManager: Room Lifecycle and 5-Digit Code Generator
const { GAME_MODES, MINI_CHALLENGES } = require('../../../shared/gameConfig');
const { SOCKET_EVENTS } = require('../../../shared/events');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId / code -> Room Object
    this.seedInitialRoom();
  }

  generate5DigitCode() {
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  seedInitialRoom() {
    const defaultCode = '83921';
    const room = this.createRoom(defaultCode, 'Public Neo Lounge 🎨', 'System', GAME_MODES.MULTIPLAYER_FFA);
    this.rooms.set(defaultCode, room);
  }

  createRoom(customCode, name, hostUsername, mode = GAME_MODES.MULTIPLAYER_FFA, options = {}) {
    const code = customCode || this.generate5DigitCode();
    const room = {
      id: code,
      code: code,
      name: name || `${hostUsername}'s Room`,
      host: hostUsername,
      gameMode: mode,
      maxPlayers: options.maxPlayers || 10,
      roundTime: options.roundTime || 60,
      totalRounds: options.totalRounds || 3,
      miniChallengeEnabled: options.miniChallengeEnabled !== undefined ? options.miniChallengeEnabled : true,
      enabledChallenges: options.enabledChallenges || [MINI_CHALLENGES.NONE, MINI_CHALLENGES.COLOUR_FIX, MINI_CHALLENGES.DONT_LIFT_PEN, MINI_CHALLENGES.GEOMETRIC_ONLY],
      players: [], // { socketId, username, avatar, score: 0, isReady: false, team: 'Red' | 'Blue' }
      teams: {
        Red: { score: 0 },
        Blue: { score: 0 }
      },
      status: 'LOBBY', // LOBBY, WORD_SELECTION, PLAYING, ROUND_OVER, GAME_OVER
      currentRound: 0,
      drawerIndex: 0,
      currentDrawer: null,
      currentWord: '',
      wordOptions: [],
      correctGuessers: [],
      currentChallenge: MINI_CHALLENGES.NONE,
      forcedColor: null,
      drawingHistory: []
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(codeOrId) {
    return this.rooms.get(codeOrId) || null;
  }

  removeRoom(code) {
    if (code !== '83921') {
      this.rooms.delete(code);
    }
  }

  getPublicRoomList() {
    const list = [];
    this.rooms.forEach(room => {
      list.push({
        id: room.id,
        code: room.code,
        name: room.name,
        host: room.host,
        gameMode: room.gameMode,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status
      });
    });
    return list;
  }

  sanitizeRoom(room, timerRemaining = 0) {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      host: room.host,
      gameMode: room.gameMode,
      maxPlayers: room.maxPlayers,
      roundTime: room.roundTime,
      totalRounds: room.totalRounds,
      miniChallengeEnabled: room.miniChallengeEnabled,
      enabledChallenges: room.enabledChallenges || [MINI_CHALLENGES.NONE, MINI_CHALLENGES.COLOUR_FIX, MINI_CHALLENGES.DONT_LIFT_PEN, MINI_CHALLENGES.GEOMETRIC_ONLY],
      players: room.players.map(p => ({
        username: p.username,
        avatar: p.avatar || '🐶',
        score: p.score,
        isReady: p.isReady,
        team: p.team
      })),
      teams: room.teams,
      status: room.status,
      currentRound: room.currentRound,
      currentDrawer: room.currentDrawer,
      currentWord: room.currentWord || '',
      correctGuessersCount: room.correctGuessers ? room.correctGuessers.length : 0,
      currentChallenge: room.currentChallenge,
      forcedColor: room.forcedColor,
      timeRemaining: timerRemaining,
      wordLength: room.currentWord ? room.currentWord.length : 0
    };
  }
}

module.exports = new RoomManager();
