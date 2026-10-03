// Chat & Guess Handler
const { SOCKET_EVENTS } = require('../../../shared/events');
const { GAME_MODES } = require('../../../shared/gameConfig');
const { calculateGuesserScore, normalizeGuess } = require('../../../shared/utils');
const roomManager = require('../gameLogic/RoomManager');
const { GAME_STATUS, GAME_RULES } = require('../../../shared/contract');

// T1-21: personal "close" hint — fixed text (no answer, letters, length or distance)
const CLOSE_HINT = "You're close!";
// Levenshtein distance on code points (Thai / emoji safe); both strings are at most CHAT_MAX_LENGTH long
function editDistance(a, b) {
  const x = Array.from(a), y = Array.from(b);
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}
// Both arguments already normalized (normalizeGuess); multi-word answers are compared as one full string.
// Answer < 4 characters: never close; 4–7: distance 1; 8+: distance 1–2. An exact match is not "close".
function isCloseGuess(guess, answer) {
  const len = Array.from(answer).length;
  if (len < 4 || guess === answer) return false;
  const max = len >= 8 ? 2 : 1;
  if (Math.abs(Array.from(guess).length - len) > max) return false;
  return editDistance(guess, answer) <= max;
}

function setupChatHandlers(io, socket, timerManager, roundManager) {
  socket.on(SOCKET_EVENTS.SEND_CHAT, (payload) => {
    const room = roomManager.getRoom(socket.data.roomId);
    if (!room) return;

    const username = socket.data.username;
    const text = payload && typeof payload === 'object' ? payload.text : undefined; // untrusted payload
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > GAME_RULES.CHAT_MAX_LENGTH) return;

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
        // T1-01: the drawing team cannot guess its own word — no points, and the answer is not broadcast
        if (!roundManager.isGuesser(room, username)) {
          socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { sender: 'System', text: 'Your team is drawing — only the other team can guess.', isSystem: true });
          return;
        }
        room.correctGuessers.push(username);
        const guessOrder = room.correctGuessers.length;
        const totalGuessers = Math.max(1, roundManager.guesserCount(room));
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

        roundManager.endRoundIfAllGuessed(io, room);
        return;
      }

      // T1-21: a close (not exact) guess is never broadcast — it would hint the answer to everyone. It is echoed to the
      // sender only; an eligible guesser (T1-01: Team = the opposing team) also gets the fixed hint, on this socket only.
      if (isCloseGuess(cleanGuess, cleanAnswer)) {
        socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { sender: username, text });
        if (roundManager.isGuesser(room, username)) {
          socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { sender: 'System', text: CLOSE_HINT, isSystem: true });
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

module.exports = { setupChatHandlers, isCloseGuess, CLOSE_HINT };
