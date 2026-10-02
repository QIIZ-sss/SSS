// Game Event Handler
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES } = require('../../../shared/gameConfig');
const { GAME_STATUS, GAME_RULES, WORD_DIFFICULTY, SOLO_AI, isValidPredictRequest } = require('../../../shared/contract');
const roomManager = require('../gameLogic/RoomManager');
const aiPredictor = require('../utils/aiPredictor');
const crypto = require('crypto');

function setupGameHandlers(io, socket, timerManager, roundManager) {
  // Get public room list
  socket.on(SOCKET_EVENTS.GET_ROOMS, () => {
    socket.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Create Room (Supports custom options & 5-digit code)
  socket.on(SOCKET_EVENTS.CREATE_ROOM, (roomConfig, callback) => {
    const username = roomConfig.username || socket.data.username || 'Player';
    const avatar = roomConfig.avatar || socket.data.avatar || '🐶';
    socket.data.username = username;
    socket.data.avatar = avatar;
    
    const newRoom = roomManager.createRoom(
      null, // auto-generates 5-digit code
      roomConfig.name,
      username,
      roomConfig.gameMode || GAME_MODES.MULTIPLAYER_FFA,
      roomConfig
    );

    const sessionId = joinPlayerToRoom(io, socket, newRoom, username, avatar, timerManager, roundManager);

    if (callback) callback({ success: true, roomId: newRoom.id, code: newRoom.code, sessionId });
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Join Room by 5-Digit Code or Room ID
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId, code, username, avatar }, callback) => {
    const targetCode = (code || roomId || '').toString().trim();
    socket.data.username = username || socket.data.username || 'Player';
    socket.data.avatar = avatar || socket.data.avatar || '🐶';

    const room = roomManager.getRoom(targetCode);

    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found. Please check your 5-digit code!' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      if (callback) callback({ success: false, message: 'Room is full!' });
      return;
    }

    const sessionId = joinPlayerToRoom(io, socket, room, socket.data.username, socket.data.avatar, timerManager, roundManager);
    if (callback) callback({ success: true, roomId: room.id, code: room.code, sessionId });
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Rejoin after refresh / reconnect (B4): restore the same player slot within RECONNECT_GRACE_MS
  socket.on(SOCKET_EVENTS.REJOIN_ROOM, (payload, callback) => {
    const { code, sessionId } = payload || {};
    const room = typeof code === 'string' ? roomManager.getRoom(code) : null;
    const player = room && typeof sessionId === 'string' && sessionId
      ? room.players.find(p => p.sessionId === sessionId)
      : null;

    if (!player) {
      if (callback) callback({ success: false, message: 'Session expired.' });
      return;
    }

    if (socket.data.roomId && socket.data.roomId !== room.id) {
      handlePlayerLeave(io, socket, timerManager, roundManager);
    }

    // Detach a previous socket still bound to this player (e.g. a duplicated tab)
    if (player.socketId && player.socketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(player.socketId);
      if (oldSocket) {
        oldSocket.leave(room.id);
        oldSocket.data.roomId = null;
      }
    }
    if (player.graceTimer) {
      clearTimeout(player.graceTimer);
      player.graceTimer = null;
    }

    player.socketId = socket.id;
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.username = player.username;
    socket.data.avatar = player.avatar;

    // Same role-based view as normal broadcasts (P3.1); drawer-only data only to the drawer
    roomManager.emitRoomData(io, room, timerManager.getRemainingTime(room.id));
    if (room.status === GAME_STATUS.WORD_SELECTION && room.currentDrawer === player.username) {
      socket.emit(SOCKET_EVENTS.WORD_SELECTION, { words: room.wordOptions });
    }
    io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      sender: 'System',
      text: `${player.username} reconnected.`,
      isSystem: true
    });

    if (callback) callback({ success: true, roomId: room.id, code: room.code, username: player.username, avatar: player.avatar });
  });

  // Leave Room
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    handlePlayerLeave(io, socket, timerManager, roundManager);
  });

  // Switch Team
  socket.on(SOCKET_EVENTS.SWITCH_TEAM, ({ team }) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.gameMode !== GAME_MODES.TEAM) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player && (team === 'Red' || team === 'Blue')) {
      player.team = team;
      roomManager.emitRoomData(io, room, timerManager.getRemainingTime(room.id));
    }
  });

  // Toggle Ready
  socket.on(SOCKET_EVENTS.TOGGLE_READY, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      roomManager.emitRoomData(io, room, timerManager.getRemainingTime(room.id));
    }
  });

  // Update Room Settings (Host Only in LOBBY)
  socket.on(SOCKET_EVENTS.UPDATE_ROOM_SETTINGS, (settings) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.host !== socket.data.username || room.status !== 'LOBBY') return;

    if (settings.gameMode && Object.values(GAME_MODES).includes(settings.gameMode)) {
      const switchedToTeam = settings.gameMode === GAME_MODES.TEAM && room.gameMode !== GAME_MODES.TEAM;
      room.gameMode = settings.gameMode;
      // Players who joined before the switch were not team-balanced; there is no team-switch UI
      if (switchedToTeam) {
        room.players.forEach((p, idx) => { p.team = idx % 2 === 0 ? 'Red' : 'Blue'; });
      }
    }
    if (typeof settings.miniChallengeEnabled === 'boolean') {
      room.miniChallengeEnabled = settings.miniChallengeEnabled;
    }
    if (Array.isArray(settings.enabledChallenges)) {
      room.enabledChallenges = settings.enabledChallenges;
      room.miniChallengeEnabled = settings.enabledChallenges.length > 0;
    }
    if (settings.roundTime && typeof settings.roundTime === 'number') {
      room.roundTime = Math.max(15, Math.min(180, settings.roundTime));
    }
    if (settings.totalRounds && typeof settings.totalRounds === 'number') {
      room.totalRounds = Math.max(1, Math.min(10, settings.totalRounds));
    }
    // D1: word difficulty (null = Mixed); anything else is ignored
    if (Object.prototype.hasOwnProperty.call(settings, 'wordDifficulty')) {
      const d = settings.wordDifficulty;
      if (d === null || Object.values(WORD_DIFFICULTY).includes(d)) {
        room.wordDifficulty = d;
      }
    }
    if (settings.maxPlayers && typeof settings.maxPlayers === 'number') {
      room.maxPlayers = Math.max(2, Math.min(16, settings.maxPlayers));
    }

    roomManager.emitRoomData(io, room, timerManager.getRemainingTime(room.id));
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Start Game
  socket.on(SOCKET_EVENTS.START_GAME, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.host !== socket.data.username) return;

    const blockReason = getStartBlockReason(room);
    if (blockReason) {
      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { sender: 'System', text: blockReason, isSystem: true });
      return;
    }

    room.currentRound = 1;
    room.drawerIndex = 0;
    room.usedWords = []; // W1: word repeat tracking is per match
    room.players.forEach(p => { p.score = 0; });
    room.teams.Red.score = 0;
    room.teams.Blue.score = 0;

    roundManager.startTurnSelection(io, room);
  });

  // Select Word
  socket.on(SOCKET_EVENTS.SELECT_WORD, (payload) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'WORD_SELECTION') return;
    if (room.currentDrawer !== socket.data.username) return;
    // Only a word offered this turn; anything else is ignored and the selection (and its timer) continues
    const word = payload && payload.word;
    if (typeof word !== 'string' || !(room.wordOptions || []).includes(word)) return;

    room.currentWord = word;
    roundManager.startRoundDrawing(io, room);
  });

  // Solo AI Predict
  // A8: the server owns the target word; the client echoes it so stale requests from a previous turn are dropped
  socket.on(SOCKET_EVENTS.SOLO_AI_PREDICT, async (payload) => {
    if (!isValidPredictRequest(payload)) return;
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.gameMode !== GAME_MODES.SOLO_AI || room.status !== GAME_STATUS.PLAYING) return;
    if (room.currentDrawer !== socket.data.username || payload.targetWord !== room.currentWord) return;

    const now = Date.now();
    if (socket.data.lastPredictAt && now - socket.data.lastPredictAt < SOLO_AI.SERVER_MIN_INTERVAL_MS) return;
    socket.data.lastPredictAt = now;

    const targetWord = room.currentWord;
    const result = await aiPredictor.predictUserDrawing(targetWord, payload.pixels);
    // The turn may have ended while the model was running
    if (room.status !== GAME_STATUS.PLAYING || room.currentWord !== targetWord) return;

    socket.emit(SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT, result);

    if (result.isCorrect) {
      const player = room.players.find(p => p.username === socket.data.username);
      if (player) player.score += SOLO_AI.CORRECT_SCORE;
      roundManager.endRound(io, room, `AI guessed correctly as "${targetWord}"! 🤖`);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    handlePlayerDisconnect(io, socket, timerManager, roundManager);
  });
}

// Server-authoritative START validation. Returns a reason string, or null when the game may start.
function getStartBlockReason(room) {
  if (room.status !== GAME_STATUS.LOBBY) return 'The game can only be started from the lobby.';

  if (GAME_RULES.REQUIRE_ALL_READY) {
    const notReady = room.players.filter(p => p.username !== room.host && !p.isReady);
    if (notReady.length > 0) return `Waiting for players to be ready: ${notReady.map(p => p.username).join(', ')}`;
  }

  if (room.gameMode === GAME_MODES.MULTIPLAYER_FFA && room.players.length < GAME_RULES.MIN_PLAYERS_FFA) {
    return `At least ${GAME_RULES.MIN_PLAYERS_FFA} players are required.`;
  }

  if (room.gameMode === GAME_MODES.TEAM) {
    const red = room.players.filter(p => p.team === 'Red').length;
    const blue = room.players.filter(p => p.team === 'Blue').length;
    if (room.players.length < GAME_RULES.MIN_PLAYERS_TEAM_TOTAL || red < GAME_RULES.MIN_PLAYERS_PER_TEAM || blue < GAME_RULES.MIN_PLAYERS_PER_TEAM) {
      return `Team mode needs at least ${GAME_RULES.MIN_PLAYERS_PER_TEAM} player(s) on each team.`;
    }
  }

  return null;
}

function joinPlayerToRoom(io, socket, room, username, avatar, timerManager, roundManager) {
  handlePlayerLeave(io, socket, timerManager, roundManager);

  socket.join(room.id);
  socket.data.roomId = room.id;

  let team = 'Red';
  if (room.gameMode === GAME_MODES.TEAM) {
    const redCount = room.players.filter(p => p.team === 'Red').length;
    const blueCount = room.players.filter(p => p.team === 'Blue').length;
    team = redCount <= blueCount ? 'Red' : 'Blue';
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const existingIdx = room.players.findIndex(p => p.username === username);
  if (existingIdx >= 0) {
    const existing = room.players[existingIdx];
    existing.socketId = socket.id;
    existing.avatar = avatar || existing.avatar;
    existing.sessionId = sessionId; // invalidates the previous session for this slot
    if (existing.graceTimer) {
      clearTimeout(existing.graceTimer);
      existing.graceTimer = null;
    }
  } else {
    room.players.push({
      socketId: socket.id,
      sessionId: sessionId,
      username: username,
      avatar: avatar || '🐶',
      score: 0,
      isReady: false,
      team: team
    });
  }

  roomManager.emitRoomData(io, room, timerManager.getRemainingTime(room.id));
  io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
    sender: 'System',
    text: `${username} joined room ${room.code}!`,
    isSystem: true
  });

  return sessionId;
}

// Disconnect (refresh, network loss): keep the slot for RECONNECT_GRACE_MS before removing it (B4)
function handlePlayerDisconnect(io, socket, timerManager, roundManager) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const player = room.players.find(p => p.socketId === socket.id);
  if (!player) return;

  player.socketId = null;
  if (player.graceTimer) clearTimeout(player.graceTimer);
  player.graceTimer = setTimeout(() => {
    player.graceTimer = null;
    const currentRoom = roomManager.getRoom(roomId);
    if (currentRoom && currentRoom.players.includes(player) && !player.socketId) {
      removePlayer(io, currentRoom, player, timerManager, roundManager);
    }
  }, GAME_RULES.RECONNECT_GRACE_MS);

  io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
    sender: 'System',
    text: `${player.username} disconnected — waiting for them to reconnect.`,
    isSystem: true
  });
}

// Explicit leave (LEAVE ROOM button, joining another room): remove immediately
function handlePlayerLeave(io, socket, timerManager, roundManager) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  socket.leave(roomId);
  socket.data.roomId = null;

  const player = room.players.find(p => p.socketId === socket.id);
  if (player) {
    removePlayer(io, room, player, timerManager, roundManager);
  }
}

function removePlayer(io, room, player, timerManager, roundManager) {
  const roomId = room.id;
  if (player.graceTimer) {
    clearTimeout(player.graceTimer);
    player.graceTimer = null;
  }

  const removedIndex = room.players.indexOf(player);
  room.players = room.players.filter(p => p !== player);

  if (room.players.length === 0) {
    timerManager.stopTimer(roomId);
    if (room.code !== '83921') {
      roomManager.removeRoom(room.code);
    } else {
      roundManager.returnToLobby(io, room);
    }
  } else {
    if (room.host === player.username && room.players.length > 0) {
      room.host = room.players[0].username;
    }
    if (removedIndex >= 0) {
      roundManager.handlePlayerRemoved(io, room, removedIndex, player.username);
    }
    roomManager.emitRoomData(io, room, timerManager.getRemainingTime(roomId));
    io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      sender: 'System',
      text: `${player.username} left the room.`,
      isSystem: true
    });
  }

  io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
}

module.exports = { setupGameHandlers };
