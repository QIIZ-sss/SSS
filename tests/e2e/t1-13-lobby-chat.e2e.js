// T1-13: chat in LOBBY reaches every player of the room (and no other room); the server enforces
// GAME_RULES.CHAT_MAX_LENGTH; text is relayed as sent (the client renders it as text). Real server on TEST_PORT.
const path = require('path');
const L = require('../lib/e2e-lib');
const { GAME_RULES } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
(async () => {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B')), C = L.player(L.nextName('C')), X = L.player(L.nextName('X'));
  const { code } = await L.makeRoom(A); await L.join(B, code); await L.join(C, code);
  await L.makeRoom(X); await L.sleep(300);
  L.check('setup: room in LOBBY', L.last(A).status === 'LOBBY');
  B.s.emit('send_chat', { text: 'hi lobby' }); await L.sleep(400);
  const got = (p, text) => p.chats.some((m) => m.sender === B.name && m.text === text);
  L.check('lobby message reaches every player in the room, incl. the sender', got(A, 'hi lobby') && got(B, 'hi lobby') && got(C, 'hi lobby'));
  L.check('lobby message does not reach another room', !X.chats.some((m) => m.text === 'hi lobby'));
  B.s.emit('send_chat', { text: 'x'.repeat(GAME_RULES.CHAT_MAX_LENGTH + 1) }); await L.sleep(400);
  L.check(`message over ${GAME_RULES.CHAT_MAX_LENGTH} characters is not relayed (server-side limit)`, !A.chats.some((m) => m.text.length > GAME_RULES.CHAT_MAX_LENGTH));
  B.s.emit('send_chat', { text: 'y'.repeat(GAME_RULES.CHAT_MAX_LENGTH) }); await L.sleep(400);
  L.check(`message of exactly ${GAME_RULES.CHAT_MAX_LENGTH} characters is relayed`, A.chats.some((m) => m.text === 'y'.repeat(GAME_RULES.CHAT_MAX_LENGTH)));
  const html = '<img src=x onerror=alert(1)><b>bold</b>';
  B.s.emit('send_chat', { text: html }); await L.sleep(400);
  L.check('HTML-like text relayed unchanged as a plain string (rendered as text by the client)', A.chats.some((m) => m.text === html && typeof m.text === 'string'));
  L.check('no player was disconnected', [A, B, C, X].every((p) => p.s.connected));
  L.closeAll(A, B, C, X); L.finish();
})();
