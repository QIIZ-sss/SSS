// P3.2 (A6) drawer cannot chat during WORD_SELECTION / PLAYING (direct emit).
const L = require('../lib/e2e-lib');
(async () => {
  const A = L.player(L.nextName('H'), { autoGuess: false, autoSelect: false }), B = L.player(L.nextName('G'), { autoGuess: false });
  const { code } = await L.makeRoom(A); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  await L.waitFor(() => A.words, 5000);
  const before = B.chats.length;
  A.s.emit('send_chat', { text: `cand ${A.words.join(' ')}` }); await L.sleep(500);
  L.check('A6 drawer chat during WORD_SELECTION not delivered', B.chats.length === before, B.chats.slice(before).map(m => m.text).join('|'));
  A.s.emit('select_word', { word: A.words[0] });
  await L.waitFor(() => L.last(B).status === 'PLAYING', 3000);
  const before2 = B.chats.length;
  A.s.emit('send_chat', { text: A.words[0] }); await L.sleep(500);
  L.check('A6 drawer typing the answer during PLAYING not delivered', B.chats.length === before2, B.chats.slice(before2).map(m => m.text).join('|'));
  L.check('A6 drawer gets a system notice', A.chats.some(m => m.isSystem && /drawer cannot chat/i.test(m.text)));
  const before3 = A.chats.length;
  B.s.emit('send_chat', { text: 'hello there' }); await L.sleep(400);
  L.check('A6 guesser chat still delivered to drawer', A.chats.slice(before3).some(m => m.text === 'hello there'));
  B.s.emit('send_chat', { text: A.words[0] }); // guesser guesses correctly → round ends (only guesser)
  await L.waitFor(() => L.last(A).status === 'ROUND_OVER', 3000);
  const before4 = B.chats.length;
  A.s.emit('send_chat', { text: 'gg' }); await L.sleep(400);
  L.check('A6 drawer may chat again in ROUND_OVER', B.chats.slice(before4).some(m => m.text === 'gg'));
  L.closeAll(A, B); L.finish();
})();
