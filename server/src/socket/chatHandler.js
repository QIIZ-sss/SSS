// Chat & Guess Handler
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES } = require('../../../shared/gameConfig');
const { calculateGuesserScore, normalizeGuess } = require('../../../shared/utils');
const roomManager = require('../gameLogic/RoomManager');
const { GAME_STATUS, GAME_RULES } = require('../../../shared/contract');

function setupChatHandlers(io, socket, timerManager, roundManager) {
  socket.on(SOCKET_EVENTS.SEND_CHAT, (payload) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room) return;

    const username = socket.data.username;
    const text = payload && typeof payload === 'object' ? payload.text : undefined; // untrusted payload
    if (typeof text !== 'string' || text.trim().length === 0) return;

    const isDrawer = room.currentDrawer === username;
    const hasGuessed = room.correctGuessers ? room.correctGuessers.includes(username) : false;
    const isPlaying = room.status === 'PLAYING';

    // A6: the drawer may not chat while the word is secret (server-enforced; client input is UX only)
    const isSecretTurn = room.status === GAME_STATUS.WORD_SELECTION || room.status === GAME_STATUS.PLAYING;
    if (isDrawer && isSecretTurn && !GAME_RULES.DRAWER_CAN_CHAT) {
      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { sender: 'System', text: 'The drawer cannot chat during the turn.', isSystem: true });
      return;
    }

    if (isPlaying && !isDrawer && !hasGuessed && room.currentWord) {
      const cleanGuess = normalizeGuess(text);
      const cleanAnswer = normalizeGuess(room.currentWord);

      if (cleanGuess === cleanAnswer) {
        room.correctGuessers.push(username);
        const guessOrder = room.correctGuessers.length;
        const totalGuessers = Math.max(1, room.players.length - 1);
        const timeRemaining = timerManager.getRemainingTime(room.id);
        const pointsEarned = calculateGuesserScore(guessOrder, totalGuessers, timeRemaining, room.roundTime);

        const player = room.players.find(p => p.username === username);
        if (player) {
          player.score += pointsEarned;
          if (room.gameMode === GAME_MODES.TEAM && player.team) {
            room.teams[player.team].score += pointsEarned;
          }
        }

        // SRS Draft 2: Answer Concealment broadcast
        io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          sender: 'System',
          text: `🎉 คุณ ${username} ทายถูกแล้ว! (+${pointsEarned} คะแนน)`,
          isSystem: true,
          isCorrectNotice: true,
          guesser: username
        });

        socket.emit(SOCKET_EVENTS.CORRECT_GUESS, { points: pointsEarned });
        roomManager.emitRoomData(io, room, timeRemaining);

        if (room.correctGuessers.length >= totalGuessers) {
          roundManager.endRound(io, room, 'Everyone guessed correctly! 🎯');
        }
        return;
      }
    }

    if (isPlaying && hasGuessed) {
      room.players.forEach(p => {
        const targetSocket = io.sockets.sockets.get(p.socketId);
        if (targetSocket) {
          if (p.username === room.currentDrawer || room.correctGuessers.includes(p.username)) {
            targetSocket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
              sender: username,
              text: text,
              isConcealedChat: true
            });
          }
        }
      });
    } else {
      io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        sender: username,
        text: text
      });
    }
  });
}

module.exports = { setupChatHandlers };
