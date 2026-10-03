// P2.5 (A7) timer evidence: real timer_tick values with timestamps, 2 clients, 3 rounds, no refresh.
const L = require('../lib/e2e-lib');
(async () => {
  const RT = 15; // the shortest round the server allows (create_room clamps like update_room_settings since U11)
  const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
  const { code } = await L.makeRoom(A, { roundTime: RT }); await L.join(B, code);
  A.s.emit('update_room_settings', { totalRounds: 3 }); B.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  await L.waitFor(() => A.frames.some(f => f.status === 'GAME_OVER'), 240000);
  // split ticks into PLAYING segments: each segment starts at a tick equal to RT right after a round_start
  const segs = p => {
    const out = []; let cur = null;
    p.events.forEach(e => {
      if (e.ev === 'round_start') { cur = []; out.push(cur); }
      else if (e.ev === 'round_end') cur = null;
      else if (e.ev === 'timer_tick' && cur) cur.push({ t: e.t, v: e.data.timeRemaining });
    });
    return out;
  };
  const sa = segs(A), sb = segs(B);
  console.log('PLAYING tick samples (client A, value@ms-since-segment-start):');
  sa.forEach((s, i) => console.log(`  turn ${i + 1}: ` + s.map(x => `${x.v}@${x.t - s[0].t}`).join(' ')));
  L.check('A7 6 PLAYING turns observed over 3 rounds (2 players)', sa.length === 6 && sb.length === 6, `${sa.length}/${sb.length}`);
  const expected = Array.from({ length: RT + 1 }, (_, i) => RT - i).join(',');
  L.check('A7 each turn counts RT..0 strictly decreasing', sa.every(s => s.map(x => x.v).join(',') === expected), sa.map(s => s.map(x => x.v).join(',')).join(' | '));
  const gaps = sa.flatMap(s => s.slice(1).map((x, i) => x.t - s[i].t));
  L.check('A7 ticks ~1 s apart (900–1100 ms)', gaps.every(g => g >= 900 && g <= 1100), `min=${Math.min(...gaps)} max=${Math.max(...gaps)}`);
  L.check('A7 timer reaches 0 when the round ends by timeout', sa.every(s => s[s.length - 1].v === 0));
  let maxSkew = 0;
  sa.forEach((s, i) => s.forEach((x, j) => { const y = sb[i] && sb[i][j]; if (y && y.v === x.v) maxSkew = Math.max(maxSkew, Math.abs(y.t - x.t)); }));
  L.check('A7 clients in sync (same value within 1000 ms; QA T-01 criterion)', maxSkew <= 1000, `max skew=${maxSkew} ms`);
  L.closeAll(A, B); L.finish();
})();
