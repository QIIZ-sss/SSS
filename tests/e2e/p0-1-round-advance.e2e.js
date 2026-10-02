// P0-1: the round ends as soon as every CONNECTED guesser has guessed correctly; a guesser in the reconnect grace
// period (disconnected, not left) is not waited for.
const L = require('../lib/e2e-lib');
const roundEnd = (p, t0) => p.events.find((e) => e.t >= t0 && e.ev === 'round_end');

async function setup() {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'), { autoGuess: false }), C = L.player(L.nextName('C'), { autoGuess: false });
  const { code } = await L.makeRoom(A); await L.join(B, code); await L.join(C, code);
  A.s.emit('update_room_settings', { totalRounds: 1 }); B.s.emit('toggle_ready'); C.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  await L.waitFor(() => L.last(B).status === 'PLAYING' && L.ORACLE[code], 5000);
  return { A, B, C, code };
}

(async () => {
  { // B guesses, C still connected → round continues; C disconnects → round ends at once
    const { A, B, C, code } = await setup();
    const t0 = Date.now();
    B.s.emit('send_chat', { text: L.ORACLE[code] }); await L.sleep(600);
    L.check('one of two connected guessers correct → round still PLAYING', L.last(A).status === 'PLAYING' && !roundEnd(A, t0));
    const t1 = Date.now();
    C.s.disconnect();
    const ended = await L.waitFor(() => roundEnd(A, t1), 2000);
    L.check('the other guesser disconnects (grace period) → round ends immediately', ended && /Everyone guessed/.test(roundEnd(A, t1).data.reason),
      ended ? `${roundEnd(A, t1).t - t1} ms` : 'no round_end within 2 s');
    L.closeAll(A, B, C);
  }
  { // C disconnects first, then B guesses → round ends at once
    const { A, B, C, code } = await setup();
    C.s.disconnect(); await L.sleep(400);
    L.check('a guesser disconnecting with nobody correct does not end the round', L.last(A).status === 'PLAYING');
    const t1 = Date.now();
    B.s.emit('send_chat', { text: L.ORACLE[code] });
    const ended = await L.waitFor(() => roundEnd(A, t1), 2000);
    L.check('the only connected guesser guesses correctly → round ends immediately', ended, ended ? `${roundEnd(A, t1).t - t1} ms` : 'no round_end within 2 s');
    L.closeAll(A, B, C);
  }
  { // normal case unchanged: both connected guessers correct → ends
    const { A, B, C, code } = await setup();
    const t1 = Date.now();
    B.s.emit('send_chat', { text: L.ORACLE[code] }); C.s.emit('send_chat', { text: L.ORACLE[code] });
    L.check('all connected guessers correct → round ends immediately', await L.waitFor(() => roundEnd(A, t1), 2000));
    L.closeAll(A, B, C);
  }
  L.finish();
})();
