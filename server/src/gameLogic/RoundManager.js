// RoundManager: Drawer Switching, Word Selection, and Auto-Round Transitions
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES, MINI_CHALLENGES, DEFAULT_COLOR_PALETTE } = require('../../../shared/gameConfig');
const { calculateGuesserScore, calculateDrawerScore, normalizeGuess } = require('../../../shared/utils');
const { GAME_RULES } = require('../../../shared/contract');
const Word = require('../models/Word');
const Score = require('../models/Score');

class RoundManager {
  constructor(roomManager, timerManager) {
    this.roomManager = roomManager;
    this.timerManager = timerManager;
  }

  startTurnSelection(io, room) {
    this.timerManager.stopTimer(room.id);

    // Players may have left during ROUND_OVER: if everyone in this round has drawn, close the round here
    if (room.players.length > 0 && room.drawerIndex >= room.players.length) {
      room.drawerIndex = 0;
      if (room.currentRound >= room.totalRounds) {
        this.endGameMatch(io, room);
        return;
      }
      room.currentRound++;
    }

    room.status = 'WORD_SELECTION';
    room.correctGuessers = [];
    room.drawingHistory = [];
    room.currentWord = '';

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

    const isSolo = room.gameMode === GAME_MODES.SOLO_AI;
    // A8: Solo AI only uses words the model can recognise (SOLO_AI.GAME_WORDS)
    // W1: unused eligible words come first; if fewer than 3 remain, top up with used words from the same pool;
    // once every eligible word was used the list starts over
    const wordFilter = { difficulty: room.wordDifficulty, aiOnly: isSolo };
    let wordChoices = Word.getRandomWords(3, { ...wordFilter, exclude: room.usedWords || [] }).map(w => w.word);
    if (wordChoices.length === 0) {
      room.usedWords = [];
      wordChoices = Word.getRandomWords(3, wordFilter).map(w => w.word);
    } else if (wordChoices.length < 3) {
      wordChoices = wordChoices.concat(Word.getRandomWords(3 - wordChoices.length, { ...wordFilter, exclude: wordChoices }).map(w => w.word));
    }
    room.wordOptions = wordChoices;

    // Notify clients of Server-Authoritative turn change & state reset
    io.to(room.id).emit(SOCKET_EVENTS.ROUND_CHANGE, {
      currentDrawer: room.currentDrawer,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      status: 'WORD_SELECTION'
    });

    this.roomManager.emitRoomData(io, room, 10);
    io.to(room.id).emit(SOCKET_EVENTS.DRAW_CLEAR);

    // A8: in Solo AI the server picks the target word itself and the turn starts immediately
    if (isSolo) {
      room.currentWord = wordChoices[0];
      this.startRoundDrawing(io, room);
      return;
    }

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
    room.usedWords = [...(room.usedWords || []), room.currentWord]; // W1

    io.to(room.id).emit(SOCKET_EVENTS.ROUND_START, {
      drawer: room.currentDrawer,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      challenge: room.currentChallenge,
      forcedColor: room.forcedColor,
      roundTime: room.roundTime
    });

    this.roomManager.emitRoomData(io, room, room.roundTime);

    // Server-Authoritative Countdown Loop
    this.timerManager.startTimer(room.id, room.roundTime, () => {
      this.endRound(io, room, 'Time is up!');
    });
  }

  endRound(io, room, reason = '') {
    this.timerManager.stopTimer(room.id);
    room.status = 'ROUND_OVER';

    const totalGuessers = Math.max(1, this.guesserCount(room));
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

    this.roomManager.emitRoomData(io, room, 0);

    // Increment drawer index for next turn
    room.drawerIndex++;

    // Never advance currentRound past totalRounds (prevents "Round 4/3")
    let isFinalTurn = false;
    if (room.drawerIndex >= room.players.length) {
      room.drawerIndex = 0;
      if (room.currentRound >= room.totalRounds) {
        isFinalTurn = true;
      } else {
        room.currentRound++;
      }
    }

    // Auto-advance turn after 4s pause without requiring client refresh!
    this.timerManager.scheduleTransition(room.id, 4000, () => {
      if (isFinalTurn || room.players.length === 0) {
        this.endGameMatch(io, room);
      } else {
        this.startTurnSelection(io, room);
      }
    });
  }

  // Keep turn order consistent after a player left (called after the player was removed from room.players)
  handlePlayerRemoved(io, room, removedIndex, removedUsername) {
    const inTurn = room.status === 'WORD_SELECTION' || room.status === 'PLAYING';
    const wasDrawer = inTurn && removedUsername === room.currentDrawer;

    // drawerIndex points at the current drawer during a turn and at the next drawer during ROUND_OVER
    if (removedIndex < room.drawerIndex || wasDrawer) {
      room.drawerIndex--;
    }

    if (wasDrawer) {
      this.endRound(io, room, 'The drawer left the room.');
      return;
    }

    this.endRoundIfAllGuessed(io, room);
  }

  // T1-01: who may guess this turn. FFA / Solo: everyone except the drawer. Team: only the OPPOSING team —
  // the drawer's teammates never guess their own team's word.
  isGuesser(room, username) {
    if (username === room.currentDrawer) return false;
    if (room.gameMode !== GAME_MODES.TEAM) return true;
    const drawer = room.players.find(p => p.username === room.currentDrawer);
    const player = room.players.find(p => p.username === username);
    return !!(drawer && player && player.team !== drawer.team);
  }

  getGuessers(room) {
    return room.players.filter(p => this.isGuesser(room, p.username));
  }

  // Scoring divisor: Team counts the opposing team only; FFA keeps "everyone but the drawer"
  guesserCount(room) {
    return room.gameMode === GAME_MODES.TEAM ? this.getGuessers(room).length : room.players.length - 1;
  }

  // P0-1: the round ends as soon as every CONNECTED guesser has guessed correctly (at least one).
  // Players in the reconnect grace period (socketId null) are not waited for. T1-01: Team = opposing team only.
  endRoundIfAllGuessed(io, room) {
    if (room.status !== 'PLAYING') return false;
    const guessers = this.getGuessers(room);
    const anyCorrect = guessers.some(p => room.correctGuessers.includes(p.username));
    const waiting = guessers.some(p => p.socketId && !room.correctGuessers.includes(p.username));
    if (!anyCorrect || waiting) return false;
    this.endRound(io, room, 'Everyone guessed correctly! 🎯');
    return true;
  }

  // T1-22: a running multiplayer match stops when a removal leaves too few players (FFA < MIN_PLAYERS_FFA,
  // Team: a team below MIN_PLAYERS_PER_TEAM). Only real removals count (leave / reconnect grace expired).
  stopMatchIfTooFewPlayers(io, room) {
    if (!['WORD_SELECTION', 'PLAYING', 'ROUND_OVER'].includes(room.status) || room.gameMode === GAME_MODES.SOLO_AI) return false;
    let enough;
    if (room.gameMode === GAME_MODES.TEAM) {
      const red = room.players.filter(p => p.team === 'Red').length;
      const blue = room.players.filter(p => p.team === 'Blue').length;
      enough = room.players.length >= GAME_RULES.MIN_PLAYERS_TEAM_TOTAL && red >= GAME_RULES.MIN_PLAYERS_PER_TEAM && blue >= GAME_RULES.MIN_PLAYERS_PER_TEAM;
    } else {
      enough = room.players.length >= GAME_RULES.MIN_PLAYERS_FFA;
    }
    if (enough) return false;
    this.endGameMatch(io, room, 'Not enough players left — the match was stopped.');
    return true;
  }

  // T1-02: final ranking in every mode = player score, highest first (numeric). Every player is kept, 0 pts too;
  // equal scores keep join order (stable sort). Team totals are shown separately (teamScores).
  rankPlayers(room) {
    const score = (p) => Number(p.score) || 0;
    return [...room.players].sort((a, b) => score(b) - score(a));
  }

  // stoppedReason: set when the match was stopped early (T1-22); such a match is not recorded on the leaderboard
  endGameMatch(io, room, stoppedReason = null) {
    this.timerManager.stopTimer(room.id);
    room.status = 'GAME_OVER';

    if (room.gameMode !== GAME_MODES.SOLO_AI && !stoppedReason) {
      room.players.forEach(p => {
        Score.addRecord(p.username, p.score, room.gameMode);
      });
    }

    let winnerText = '';
    if (stoppedReason) {
      winnerText = 'Match stopped';
    } else if (room.gameMode === GAME_MODES.TEAM) {
      if (room.teams.Red.score > room.teams.Blue.score) winnerText = 'Team Red Wins! 🔴';
      else if (room.teams.Blue.score > room.teams.Red.score) winnerText = 'Team Blue Wins! 🔵';
      else winnerText = "It's a Tie! 🤝";
    } else {
      const sorted = this.rankPlayers(room);
      winnerText = sorted[0] ? `Winner: ${sorted[0].username} 🏆` : 'Game Over';
    }

    // T1-07: kept so a player who reloads during GAME_OVER gets the results again (cleared in returnToLobby)
    room.lastGameOver = {
      gameMode: room.gameMode,
      winnerText,
      finalScores: this.rankPlayers(room).map(p => ({ username: p.username, avatar: p.avatar, score: p.score, team: p.team })),
      teamScores: room.teams,
      stopped: !!stoppedReason,
      reason: stoppedReason || ''
    };
    io.to(room.id).emit(SOCKET_EVENTS.GAME_OVER, room.lastGameOver);

    this.roomManager.emitRoomData(io, room, 0);

    // Final scores stay visible during GAME_OVER; server returns the room to LOBBY afterwards
    this.timerManager.scheduleTransition(room.id, GAME_RULES.GAME_OVER_DELAY_MS, () => {
      if (room.status === 'GAME_OVER') {
        this.returnToLobby(io, room);
      }
    });
  }

  returnToLobby(io, room) {
    this.timerManager.stopTimer(room.id);
    room.status = 'LOBBY';

    // Reset round/score/ready state only when entering LOBBY
    room.currentRound = 0;
    room.drawerIndex = 0;
    room.currentDrawer = null;
    room.currentWord = '';
    room.wordOptions = [];
    room.usedWords = []; // W1
    room.lastGameOver = null; // T1-07
    room.correctGuessers = [];
    room.currentChallenge = MINI_CHALLENGES.NONE;
    room.forcedColor = null;
    room.drawingHistory = [];
    room.players.forEach(p => {
      p.score = 0;
      p.isReady = false;
    });
    room.teams.Red.score = 0;
    room.teams.Blue.score = 0;

    this.roomManager.emitRoomData(io, room, 0);
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, this.roomManager.getPublicRoomList());
  }
}

module.exports = RoundManager;
