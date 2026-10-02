// D3 / QA-4: the server ignores draw_fill during DONT_LIFT_PEN (not relayed, not in draw_sync history); other challenges keep it.
const L = require('../lib/e2e-lib');

async function fillTurn(challenge) {
  const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'), { autoGuess: false });
  const { code } = await L.makeRoom(A); await L.join(B, code);
  A.s.emit('update_room_settings', { enabledChallenges: [challenge] }); B.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  const playing = await L.waitFor(() => L.last(B).status === 'PLAYING', 5000);
  const t0 = Date.now();
  A.s.emit('draw_fill', { color: '#3B82F6' }); await L.sleep(400);
  const relayed = B.events.some((e) => e.t >= t0 && e.ev === 'draw_fill');
  const history = await new Promise((r) => { B.s.once('draw_sync', r); B.s.emit('draw_sync'); });
  L.closeAll(A, B);
  return { playing, challenge: L.last(B).currentChallenge, relayed, stored: (history || []).some((e) => e.type === 'fill') };
}

(async () => {
  const blocked = await fillTurn('DONT_LIFT_PEN');
  L.check('DONT_LIFT_PEN turn is playing with that challenge', blocked.playing && blocked.challenge === 'DONT_LIFT_PEN', JSON.stringify(blocked));
  L.check('DONT_LIFT_PEN: draw_fill is not relayed to the guesser', !blocked.relayed);
  L.check('DONT_LIFT_PEN: draw_fill is not stored in the draw_sync history', !blocked.stored);
  const none = await fillTurn('NONE');
  L.check('NONE: draw_fill still relayed and stored', none.playing && none.relayed && none.stored, JSON.stringify(none));
  const colour = await fillTurn('COLOUR_FIX');
  L.check('COLOUR_FIX: draw_fill still relayed and stored', colour.playing && colour.relayed && colour.stored, JSON.stringify(colour));
  L.finish();
})();
