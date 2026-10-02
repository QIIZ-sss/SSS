// T1-06: the server ignores chat longer than GAME_RULES.CHAT_MAX_LENGTH; a message at the limit is delivered.
const path = require('path');
const L = require('../lib/e2e-lib');
const { GAME_RULES } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
(async () => {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'));
  const { code } = await L.makeRoom(A); await L.join(B, code); await L.sleep(300);
  const max = GAME_RULES.CHAT_MAX_LENGTH;
  A.s.emit('send_chat', { text: 'a'.repeat(max + 1) }); await L.sleep(300);
  L.check(`message of ${max + 1} chars is not delivered`, !B.chats.some((m) => m.text && m.text.length > max));
  A.s.emit('send_chat', { text: 'b'.repeat(max) }); await L.sleep(300);
  L.check(`message of exactly ${max} chars is delivered`, B.chats.some((m) => m.text === 'b'.repeat(max)));
  L.closeAll(A, B);
  L.finish();
})();
