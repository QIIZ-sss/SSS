// RoundManager: Drawer Switching, Word Selection, and Auto-Round Transitions
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES, MINI_CHALLENGES, DEFAULT_COLOR_PALETTE } = require('../../../shared/gameConfig');
const { calculateGuesserScore, calculateDrawerScore, normalizeGuess } = require('../../../shared/utils');
const Word = require('../models/Word');
const Score = require('../models/Score');

class RoundManager {
  constructor(roomManager, timerManager) {
    this.roomManager = roomManager;
    this.timerManager = timerManager;
  }

  startTurnSelection(io, room) {
    this.timerManager.stopTimer(room.id);

    room.status = 'WORD_SELECTION';
    room.correctGuessers = [];
    room.drawingHistory = [];

    if (room.players.length === 0) return;

    // Pick drawer
    const drawerObj = room.players[room.drawerIndex % room.players.length];
    room.currentDrawer = drawerObj.username;

    // Pick challenge randomly from room's enabled challenges list
    const availableChallenges = (room.enabledChallenges && room.enabledChallenges.length > 0)
      ? room.enabledChallenges
      : (room.miniChallengeEnabled !== false ? [MINI_CHALLENGES.NONE, MINI_CHALLENGES.COLOUR_FIX, MINI_CHALLENGES.DONT_LIFT_PEN, MINI_CHALLENGES.GEOMETRIC_ONLY] : [MINI_CHALLENGES.NONE]);

    room.currentChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    if (room.currentChallenge === MINI_CHALLENGES.COLOUR_FIX) {
      room.forcedColor = DEFAULT_COLOR_PALETTE[Math.floor(Math.random() * DEFAULT_COLOR_PALETTE.length)];
    } else {
      room.forcedColor = null;
    }

    const wordChoices = Word.getRandomWords(3).map(w => w.word);
    room.wordOptions = wordChoices;

    // Notify clients of Server-Authoritative turn change & state reset
    io.to(room.id).emit(SOCKET_EVENTS.ROUND_CHANGE, {
      currentDrawer: room.currentDrawer,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      status: 'WORD_SELECTION'
    });

    io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, this.roomManager.sanitizeRoom(room, 10));
    io.to(room.id).emit(SOCKET_EVENTS.DRAW_CLEAR);

    // Send word choices exclusively to current drawer
    const drawerSocketObj = room.players.find(p => p.username === room.currentDrawer);
    if (drawerSocketObj) {
      const socketObj = io.sockets.sockets.get(drawerSocketObj.socketId);
      if (socketObj) {
        socketObj.emit(SOCKET_EVENTS.WORD_SELECTION, { words: wordChoices });
      }
    }

    // Server Timer for word selection phase (10s auto choice)
    this.timerManager.startTimer(room.id, 10, () => {
      if (room.status === 'WORD_SELECTION') {
        room.currentWord = wordChoices[0];
        this.startRoundDrawing(io, room);
      }
    });
  }

  startRoundDrawing(io, room) {
    this.timerManager.stopTimer(room.id);
    room.status = 'PLAYING';

    io.to(room.id).emit(SOCKET_EVENTS.ROUND_START, {
      drawer: room.currentDrawer,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      challenge: room.currentChallenge,
      forcedColor: room.forcedColor,
      roundTime: room.roundTime
    });

    io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, this.roomManager.sanitizeRoom(room, room.roundTime));

    // Server-Authoritative Countdown Loop
    this.timerManager.startTimer(room.id, room.roundTime, () => {
      this.endRound(io, room, 'Time is up!');
    });
  }

  endRound(io, room, reason = '') {
    this.timerManager.stopTimer(room.id);
    room.status = 'ROUND_OVER';

    const totalGuessers = Math.max(1, room.players.length - 1);
    const correctCount = room.correctGuessers ? room.correctGuessers.length : 0;
    const drawerPoints = calculateDrawerScore(correctCount, totalGuessers);

    const drawerPlayer = room.players.find(p => p.username === room.currentDrawer);
    if (drawerPlayer) {
      drawerPlayer.score += drawerPoints;
      if (room.gameMode === GAME_MODES.TEAM && drawerPlayer.team) {
        room.teams[drawerPlayer.team].score += drawerPoints;
      }
    }

    io.to(room.id).emit(SOCKET_EVENTS.ROUND_END, {
      word: room.currentWord,
      reason: reason,
      drawerPoints: drawerPoints,
      correctGuessers: room.correctGuessers
    });

    io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, this.roomManager.sanitizeRoom(room, 0));

    // Increment drawer index for next turn
    room.drawerIndex++;

    if (room.drawerIndex >= room.players.length) {
      room.drawerIndex = 0;
      room.currentRound++;
    }

    // Auto-advance turn after 4s pause without requiring client refresh!
    setTimeout(() => {
      if (room.currentRound > room.totalRounds || room.players.length === 0) {
        this.endGameMatch(io, room);
      } else {
        this.startTurnSelection(io, room);
      }
    }, 4000);
  }

  endGameMatch(io, room) {
    this.timerManager.stopTimer(room.id);
    room.status = 'GAME_OVER';

    if (room.gameMode !== GAME_MODES.SOLO_AI) {
      room.players.forEach(p => {
        Score.addRecord(p.username, p.score, room.gameMode);
      });
    }

    let winnerText = '';
    if (room.gameMode === GAME_MODES.TEAM) {
      if (room.teams.Red.score > room.teams.Blue.score) winnerText = 'Team Red Wins! 🔴';
      else if (room.teams.Blue.score > room.teams.Red.score) winnerText = 'Team Blue Wins! 🔵';
      else winnerText = "It's a Tie! 🤝";
    } else {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      winnerText = sorted[0] ? `Winner: ${sorted[0].username} 🏆` : 'Game Over';
    }

    io.to(room.id).emit(SOCKET_EVENTS.GAME_OVER, {
      winnerText,
      finalScores: room.players.map(p => ({ username: p.username, avatar: p.avatar, score: p.score, team: p.team })),
      teamScores: room.teams
    });

    io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, this.roomManager.sanitizeRoom(room, 0));
  }
}

module.exports = RoundManager;
