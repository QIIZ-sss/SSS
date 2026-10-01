// Draw Handler with Live Shape Preview support
const { SOCKET_EVENTS } = require('../../../shared/events');
const { MINI_CHALLENGES } = require('../../../shared/gameConfig');
const roomManager = require('../gameLogic/RoomManager');

function setupDrawHandlers(io, socket) {
  // Client starts drawing stroke
  socket.on(SOCKET_EVENTS.DRAW_BEGIN, (data) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    if (room.currentChallenge === MINI_CHALLENGES.COLOUR_FIX && room.forcedColor) {
      data.color = room.forcedColor;
    }

    const drawEvent = { type: 'begin', ...data, timestamp: Date.now() };
    room.drawingHistory.push(drawEvent);
    socket.to(room.id).emit(SOCKET_EVENTS.DRAW_BEGIN, data);
  });

  // Client continuous stroke path
  socket.on(SOCKET_EVENTS.DRAW_PATH, (data) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    if (room.currentChallenge === MINI_CHALLENGES.COLOUR_FIX && room.forcedColor) {
      data.color = room.forcedColor;
    }

    const drawEvent = { type: 'path', ...data, timestamp: Date.now() };
    room.drawingHistory.push(drawEvent);
    socket.to(room.id).emit(SOCKET_EVENTS.DRAW_PATH, data);
  });

  // Live Ghost Shape Preview broadcast for Geometric Shapes
  socket.on(SOCKET_EVENTS.SHAPE_PREVIEW, (data) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    socket.to(room.id).emit(SOCKET_EVENTS.SHAPE_PREVIEW, data);
  });

  // Client finishes stroke path / geometric shape
  socket.on(SOCKET_EVENTS.DRAW_END, (data) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    const drawEvent = { type: 'end', ...data, timestamp: Date.now() };
    room.drawingHistory.push(drawEvent);
    socket.to(room.id).emit(SOCKET_EVENTS.DRAW_END, data);
  });

  // Client clears canvas
  socket.on(SOCKET_EVENTS.DRAW_CLEAR, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    room.drawingHistory = [];
    io.to(room.id).emit(SOCKET_EVENTS.DRAW_CLEAR);
  });

  // Client bucket fill
  socket.on(SOCKET_EVENTS.DRAW_FILL, (data) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentDrawer !== socket.data.username) return;

    if (room.currentChallenge === MINI_CHALLENGES.COLOUR_FIX && room.forcedColor) {
      data.color = room.forcedColor;
    }

    const drawEvent = { type: 'fill', ...data, timestamp: Date.now() };
    room.drawingHistory.push(drawEvent);
    socket.to(room.id).emit(SOCKET_EVENTS.DRAW_FILL, data);
  });

  // Canvas synchronization
  socket.on(SOCKET_EVENTS.DRAW_SYNC, () => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (room) {
      socket.emit(SOCKET_EVENTS.DRAW_SYNC, room.drawingHistory);
    }
  });
}

module.exports = { setupDrawHandlers };
