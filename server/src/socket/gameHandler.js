// Game Event Handler
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES } = require('../../../shared/gameConfig');
const roomManager = require('../gameLogic/RoomManager');
const aiPredictor = require('../utils/aiPredictor');

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

    joinPlayerToRoom(io, socket, newRoom, username, avatar, timerManager);

    if (callback) callback({ success: true, roomId: newRoom.id, code: newRoom.code });
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

    joinPlayerToRoom(io, socket, room, socket.data.username, socket.data.avatar, timerManager);
    if (callback) callback({ success: true, roomId: room.id, code: room.code });
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Leave Room
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    handlePlayerLeave(io, socket, timerManager);
  });

  // Switch Team
  socket.on(SOCKET_EVENTS.SWITCH_TEAM, ({ team }) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.gameMode !== GAME_MODES.TEAM) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player && (team === 'Red' || team === 'Blue')) {
      player.team = team;
      io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, roomManager.sanitizeRoom(room, timerManager.getRemainingTime(room.id)));
    }
  });

  // Toggle Ready
  socket.on(SOCKET_EVENTS.TOGGLE_READY, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, roomManager.sanitizeRoom(room, timerManager.getRemainingTime(room.id)));
    }
  });

  // Update Room Settings (Host Only in LOBBY)
  socket.on(SOCKET_EVENTS.UPDATE_ROOM_SETTINGS, (settings) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.host !== socket.data.username || room.status !== 'LOBBY') return;

    if (settings.gameMode && Object.values(GAME_MODES).includes(settings.gameMode)) {
      room.gameMode = settings.gameMode;
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
    if (settings.maxPlayers && typeof settings.maxPlayers === 'number') {
      room.maxPlayers = Math.max(2, Math.min(16, settings.maxPlayers));
    }

    io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, roomManager.sanitizeRoom(room, timerManager.getRemainingTime(room.id)));
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
  });

  // Start Game
  socket.on(SOCKET_EVENTS.START_GAME, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.host !== socket.data.username) return;

    room.currentRound = 1;
    room.drawerIndex = 0;
    room.players.forEach(p => { p.score = 0; });
    room.teams.Red.score = 0;
    room.teams.Blue.score = 0;

    roundManager.startTurnSelection(io, room);
  });

  // Select Word
  socket.on(SOCKET_EVENTS.SELECT_WORD, ({ word }) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'WORD_SELECTION') return;
    if (room.currentDrawer !== socket.data.username) return;

    room.currentWord = word;
    roundManager.startRoundDrawing(io, room);
  });

  // Solo AI Predict
  socket.on(SOCKET_EVENTS.SOLO_AI_PREDICT, async ({ pixels }) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.gameMode !== GAME_MODES.SOLO_AI) return;

    const result = await aiPredictor.predictUserDrawing(room.currentWord, pixels);
    socket.emit(SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT, result);

    if (result.isCorrect && room.status === 'PLAYING') {
      const player = room.players.find(p => p.username === socket.data.username);
      if (player) player.score += 500;
      roundManager.endRound(io, room, `AI guessed correctly as "${room.currentWord}"! 🤖`);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    handlePlayerLeave(io, socket, timerManager);
  });
}

function joinPlayerToRoom(io, socket, room, username, avatar, timerManager) {
  handlePlayerLeave(io, socket, timerManager);

  socket.join(room.id);
  socket.data.roomId = room.id;

  let team = 'Red';
  if (room.gameMode === GAME_MODES.TEAM) {
    const redCount = room.players.filter(p => p.team === 'Red').length;
    const blueCount = room.players.filter(p => p.team === 'Blue').length;
    team = redCount <= blueCount ? 'Red' : 'Blue';
  }

  const existingIdx = room.players.findIndex(p => p.username === username);
  if (existingIdx >= 0) {
    room.players[existingIdx].socketId = socket.id;
    room.players[existingIdx].avatar = avatar || room.players[existingIdx].avatar;
  } else {
    room.players.push({
      socketId: socket.id,
      username: username,
      avatar: avatar || '🐶',
      score: 0,
      isReady: false,
      team: team
    });
  }

  io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, roomManager.sanitizeRoom(room, timerManager.getRemainingTime(room.id)));
  io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
    sender: 'System',
    text: `${username} joined room ${room.code}!`,
    isSystem: true
  });
}

function handlePlayerLeave(io, socket, timerManager) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  socket.leave(roomId);
  socket.data.roomId = null;

  room.players = room.players.filter(p => p.socketId !== socket.id);

  if (room.players.length === 0) {
    timerManager.stopTimer(roomId);
    if (room.code !== '83921') {
      roomManager.removeRoom(room.code);
    } else {
      room.status = 'LOBBY';
      room.drawingHistory = [];
    }
  } else {
    if (room.host === socket.data.username && room.players.length > 0) {
      room.host = room.players[0].username;
    }
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_DATA, roomManager.sanitizeRoom(room, timerManager.getRemainingTime(roomId)));
    io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      sender: 'System',
      text: `${socket.data.username} left the room.`,
      isSystem: true
    });
  }

  io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, roomManager.getPublicRoomList());
}

module.exports = { setupGameHandlers };
