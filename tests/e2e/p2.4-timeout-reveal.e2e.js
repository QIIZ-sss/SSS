// P2.4 (A3) timeout reveal: nobody guesses → ROUND_OVER payload carries the answer for guessers.
const L = require('../lib/e2e-lib');
(async () => {
  const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
  const { code } = await L.makeRoom(A, { roundTime: 5 }); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  await L.waitFor(() => B.frames.some(f => f.status === 'ROUND_OVER'), 25000);
  const end = B.events.find(e => e.ev === 'round_end');
  const ro = B.frames.find(f => f.status === 'ROUND_OVER');
  L.check('A3 round ends by timeout', end && /time is up/i.test(end.data.reason), end && end.data.reason);
  L.check('A3 guesser receives the answer in round_end', end && end.data.word === L.ORACLE[code], end && `${end.data.word} vs ${L.ORACLE[code]}`);
  L.check('A3 guesser room_data in ROUND_OVER carries the answer', ro && ro.currentWord === L.ORACLE[code], ro && ro.currentWord);
  L.check('A3 drawer scores 0 when nobody guessed', end && end.data.drawerPoints === 0);
  L.closeAll(A, B); L.finish();
})();
