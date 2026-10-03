// T1-15 / U9: players choose their team in a Team lobby (switch_team); not during a match, not outside Team mode;
// an emptied team can be refilled by switching, which unblocks START.
const L = require('../lib/e2e-lib');
const teamOf = (p, name) => (L.last(p).players.find((x) => x.username === name) || {}).team;
(async () => {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B')), C = L.player(L.nextName('C'));
  const { code } = await L.makeRoom(A, { gameMode: 'TEAM' }); await L.join(B, code); await L.join(C, code); await L.sleep(300);
  const t0 = [A, B, C].map((p) => teamOf(A, p.name)).join(',');
  L.check('joiners are auto-balanced (Red, Blue, Red)', t0 === 'Red,Blue,Red', t0);
  C.s.emit('switch_team', { team: 'Blue' }); await L.sleep(300);
  L.check('a player switches to Blue in the lobby', teamOf(A, C.name) === 'Blue');
  C.s.emit('switch_team', { team: 'Green' }); await L.sleep(300);
  L.check('unknown team ignored', teamOf(A, C.name) === 'Blue');
  // U9: Red's only player (host A) stays; B leaves Blue → C alone on Blue is fine; now make Red empty by A→Blue
  A.s.emit('switch_team', { team: 'Blue' }); await L.sleep(300);
  B.s.emit('toggle_ready'); C.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game'); await L.sleep(400);
  L.check('everyone on Blue → START blocked (team rule)', L.last(A).status === 'LOBBY');
  B.s.emit('switch_team', { team: 'Red' }); await L.sleep(300);
  A.s.emit('start_game');
  L.check('a player switches to the empty team → START works', await L.waitFor(() => L.last(A).status !== 'LOBBY', 3000), L.last(A).status);
  const before = teamOf(A, C.name);
  C.s.emit('switch_team', { team: before === 'Red' ? 'Blue' : 'Red' }); await L.sleep(400);
  L.check('no team change during a match', teamOf(A, C.name) === before, `${before} → ${teamOf(A, C.name)}`);
  L.closeAll(A, B, C);
  const F = L.player(L.nextName('F')), G = L.player(L.nextName('G'));
  const r2 = await L.makeRoom(F); await L.join(G, r2.code); await L.sleep(200);
  const g0 = teamOf(F, G.name);
  G.s.emit('switch_team', { team: g0 === 'Red' ? 'Blue' : 'Red' }); await L.sleep(300);
  L.check('switch_team ignored outside Team mode', teamOf(F, G.name) === g0);
  L.closeAll(F, G);
  L.finish();
})();
