// T1-22: a running multiplayer match stops (GAME_OVER, stopped + reason) when a removal leaves too few players.
// A disconnect alone does not stop it (reconnect grace); expiry of the grace period does.
const L = require('../lib/e2e-lib');
const over = (p, t0) => p.events.find((e) => e.t >= t0 && e.ev === 'game_over');

async function start(names, extra = {}, teams = false) {
  const ps = names.map((n) => L.player(L.nextName(n)));
  const { code } = await L.makeRoom(ps[0], extra);
  for (const p of ps.slice(1)) await L.join(p, code);
  ps.slice(1).forEach((p) => p.s.emit('toggle_ready')); await L.sleep(300);
  ps[0].s.emit('start_game');
  await L.waitFor(() => ['WORD_SELECTION', 'PLAYING'].includes(L.last(ps[0]).status), 5000);
  return ps;
}

(async () => {
  { // FFA 2 players: the guest leaves → stopped
    const [A, B] = await start(['A', 'B']);
    await L.waitFor(() => L.last(A).status === 'PLAYING', 3000);
    const t0 = Date.now();
    B.s.emit('leave_room');
    const ok = await L.waitFor(() => over(A, t0), 2000);
    const g = ok && over(A, t0).data;
    L.check('FFA: other player leaves → game_over with stopped=true and a reason', g && g.stopped === true && /Not enough players/.test(g.reason) && g.winnerText === 'Match stopped',
      JSON.stringify(g));
    L.check('…room is in GAME_OVER (returns to LOBBY by the normal timer)', L.last(A).status === 'GAME_OVER');
    L.closeAll(A, B);
  }
  { // FFA 3 players: one leaves → match goes on
    const [A, B, C] = await start(['A', 'B', 'C']);
    const t0 = Date.now();
    C.s.emit('leave_room'); await L.sleep(800);
    L.check('FFA: 3 → 2 players → match continues', !over(A, t0) && L.last(A).status !== 'GAME_OVER' && L.last(A).status !== 'LOBBY', L.last(A).status);
    L.closeAll(A, B, C);
  }
  { // Team: Blue's only player leaves → stopped
    const [A, B, C] = await start(['A', 'B', 'C'], { gameMode: 'TEAM' });
    const blue = [A, B, C].find((p) => L.last(A).players.find((x) => x.username === p.name).team === 'Blue');
    const t0 = Date.now();
    blue.s.emit('leave_room');
    const ok = await L.waitFor(() => over(A, t0), 2000);
    L.check('Team: a team left empty → match stopped', ok && over(A, t0).data.stopped === true, ok && JSON.stringify(over(A, t0).data.reason));
    L.closeAll(A, B, C);
  }
  { // disconnect = grace period: not stopped at once; stopped when the grace period expires
    const [A, B] = await start(['A', 'B']);
    const t0 = Date.now();
    B.s.disconnect(); await L.sleep(1500);
    L.check('disconnect (reconnect grace) does not stop the match at once', !over(A, t0));
    const ok = await L.waitFor(() => over(A, t0), 33000);
    L.check('grace period expired (player removed) → match stopped', ok && over(A, t0).data.stopped === true);
    L.closeAll(A, B);
  }
  { // a normal finished match is not "stopped"
    const [A, B] = await start(['A', 'B'], { totalRounds: 1 });
    A.s.emit('update_room_settings', {}); // no-op
    const ok = await L.waitFor(() => A.gameOver, 30000);
    L.check('a normally finished match has stopped=false', ok && A.gameOver.stopped === false && /Winner/.test(A.gameOver.winnerText), ok && JSON.stringify(A.gameOver));
    L.closeAll(A, B);
  }
  L.finish();
})();
