// Room Handler for socket operations
const { SOCKET_EVENTS, GAME_MODES, MINI_CHALLENGES } = require('../../../shared/constants');

// Memory store for active rooms
const rooms = new Map();

function createRoomObject(id, name, hostUsername, mode = GAME_MODES.MULTIPLAYER_FFA, options = {}) {
  return {
    id,
    name: name || `${hostUsername}'s Room`,
    host: hostUsername,
    gameMode: mode,
    maxPlayers: options.maxPlayers || 8,
    roundTime: options.roundTime || 60,
    totalRounds: options.totalRounds || 3,
    miniChallengeEnabled: options.miniChallengeEnabled !== undefined ? options.miniChallengeEnabled : true,
    players: [], // { socketId, username, score: 0, isReady: false, team: 'Red' | 'Blue' }
    teams: {
      Red: { score: 0 },
      Blue: { score: 0 }
    },
    status: 'LOBBY', // LOBBY, WORD_SELECTION, PLAYING, ROUND_OVER, GAME_OVER
    currentRound: 0,
    currentDrawer: null,
    currentWord: '',
    wordOptions: [],
    correctGuessers: [], // array of usernames
    currentChallenge: MINI_CHALLENGES.NONE,
    roundTimer: null,
    timeRemaining: 0,
    drawingHistory: [] // stored draw events for sync
  };
}

// Initial seed room so room list is non-empty
const seedRoom = createRoomObject('room-public-1', 'Public Lounge 🎨', 'System', GAME_MODES.MULTIPLAYER_FFA);
rooms.set(seedRoom.id, seedRoom);

function setupRoomHandlers(io, socket) {
  // Send current rooms list
  socket.on(SOCKET_EVENTS.GET_ROOMS, () => {
    socket.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, getPublicRoomList());
  });

  // Create room
  socket.on(SOCKET_EVENTS.CREATE_ROOM, (roomConfig, callback) => {
    const roomId = 'room-' + Math.random().toString(36).substr(2, 7);
    const username = socket.data.username || 'Player';
    
    const newRoom = createRoomObject(
      roomId,
      roomConfig.name,
      username,
      roomConfig.gameMode || GAME_MODES.MULTIPLAYER_FFA,
      roomConfig
    );

    rooms.set(roomId, newRoom);
    
    // Join socket to room
    joinPlayerToRoom(io, socket, newRoom);

    if (callback) callback({ success: true, roomId });
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, getPublicRoomList());
  });

  // Join room
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId, username }, callback) => {
    socket.data.username = username || socket.data.username || 'Player';
    const room = rooms.get(roomId);

    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      if (callback) callback({ success: false, message: 'Room is full' });
      return;
    }

    joinPlayerToRoom(io, socket, room);
    if (callback) callback({ success: true, roomId });
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, getPublicRoomList());
  });

  // Leave room
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    handlePlayerLeave(io, socket);
  });

  // Switch team in Team mode
  socket.on(SOCKET_EVENTS.SWITCH_TEAM, ({ team }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.gameMode !== GAME_MODES.TEAM) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player && (team === 'Red' || team === 'Blue')) {
      player.team = team;
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_DATA, sanitizeRoom(room));
    }
  });

  // Toggle ready status
  socket.on(SOCKET_EVENTS.TOGGLE_READY, () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_DATA, sanitizeRoom(room));
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    handlePlayerLeave(io, socket);
  });
}

function joinPlayerToRoom(io, socket, room) {
  // Remove from previous room if any
  handlePlayerLeave(io, socket);

  socket.join(room.id);
  socket.data.roomId = room.id;

  // Determine team balancing if Team mode
  let team = 'Red';
  if (room.gameMode === GAME_MODES.TEAM) {
    const redCount = room.players.filter(p => p.team === 'Red').length;
    const blueCount = room.players.filter(p => p.team === 'Blue').length;
    team = redCount <= blueCount ? 'Red' : 'Blue';
  }

  const existingPlayerIndex = room.players.findIndex(p => p.username === socket.data.username);
  if (existingPlayerIndex >= 0) {
    room.players[existingPlayerIndex].socketId = socket.id;
  } else {
    room.players.push({
      socketId: socket.id,
      username: socket.data.username,
      score: 0,
      isReady: false,
      team: team
    });
  }

  io.to(room.id).emit(SOCKET_EVENTS.ROOM_DATA, sanitizeRoom(room));
  io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
    sender: 'System',
    text: `${socket.data.username} joined the room!`,
    isSystem: true
  });
}

function handlePlayerLeave(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  socket.leave(roomId);
  socket.data.roomId = null;

  room.players = room.players.filter(p => p.socketId !== socket.id);

  if (room.players.length === 0) {
    if (room.roundTimer) clearInterval(room.roundTimer);
    // Keep public room alive, remove user rooms if empty
    if (room.id !== 'room-public-1') {
      rooms.delete(roomId);
    } else {
      room.status = 'LOBBY';
      room.drawingHistory = [];
    }
  } else {
    // Reassign host if host left
    if (room.host === socket.data.username && room.players.length > 0) {
      room.host = room.players[0].username;
    }
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_DATA, sanitizeRoom(room));
    io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      sender: 'System',
      text: `${socket.data.username} left the room.`,
      isSystem: true
    });
  }

  io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, getPublicRoomList());
}

function getPublicRoomList() {
  const list = [];
  rooms.forEach(room => {
    list.push({
      id: room.id,
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

function sanitizeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    host: room.host,
    gameMode: room.gameMode,
    maxPlayers: room.maxPlayers,
    roundTime: room.roundTime,
    totalRounds: room.totalRounds,
    miniChallengeEnabled: room.miniChallengeEnabled,
    players: room.players.map(p => ({
      username: p.username,
      score: p.score,
      isReady: p.isReady,
      team: p.team
    })),
    teams: room.teams,
    status: room.status,
    currentRound: room.currentRound,
    currentDrawer: room.currentDrawer,
    correctGuessersCount: room.correctGuessers ? room.correctGuessers.length : 0,
    currentChallenge: room.currentChallenge,
    timeRemaining: room.timeRemaining,
    wordLength: room.currentWord ? room.currentWord.length : 0
  };
}

module.exports = {
  rooms,
  setupRoomHandlers,
  sanitizeRoom
};
