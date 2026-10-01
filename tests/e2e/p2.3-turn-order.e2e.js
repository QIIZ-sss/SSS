// P2.3 between-round transition: drawer order, per-turn reset, leaves during a game.
const L = require('../lib/e2e-lib');
const turnsOf = p => p.frames.filter(f => f.status === 'WORD_SELECTION').reduce((acc, f) => {
  const k = f.currentRound + ':' + f.currentDrawer; if (!acc.some(x => x.k === k)) acc.push({ k, round: f.currentRound, drawer: f.currentDrawer, f }); return acc; }, []);
async function room3(totalRounds, guestOpts = {}) {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'), guestOpts.B), C = L.player(L.nextName('C'), guestOpts.C);
  const { code } = await L.makeRoom(A); await L.join(B, code); await L.join(C, code);
  A.s.emit('update_room_settings', { totalRounds }); B.s.emit('toggle_ready'); C.s.emit('toggle_ready'); await L.sleep(400);
  return { A, B, C, code };
}
(async () => {
  { // V1: 3 players × 2 rounds — order, round labels, per-turn reset, timer reset
    const { A, B, C } = await room3(2);
    A.s.emit('start_game');
    await L.waitFor(() => A.frames.some(f => f.status === 'GAME_OVER'), 90000);
    const turns = turnsOf(A);
    const order = turns.map(t => t.drawer.replace(/\d.*/, '') + '@' + t.round).join(' ');
    L.check('V1 drawer order A,B,C,A,B,C with rounds 1,1,1,2,2,2', order === 'A@1 B@1 C@1 A@2 B@2 C@2', order);
    L.check('V1 6 round_end then GAME_OVER', A.events.filter(e => e.ev === 'round_end').length === 6 && A.frames.some(f => f.status === 'GAME_OVER'), String(A.events.filter(e => e.ev === 'round_end').length));
    L.check('V1 WORD_SELECTION resets correct guessers and word', turns.every(t => t.f.correctGuessersCount === 0 && t.f.currentWord === ''),
      JSON.stringify(turns.map(t => [t.f.correctGuessersCount, t.f.currentWord])));
    // timer: every round_start is followed by a first tick equal to roundTime (60)
    const starts = A.events.filter(e => e.ev === 'round_start');
    const firstTicks = starts.map(st => (A.events.slice(A.events.indexOf(st)).find(e => e.ev === 'timer_tick') || {}).data?.timeRemaining);
    L.check('V1 PLAYING timer resets to roundTime each turn', firstTicks.length === 6 && firstTicks.every(v => v === 60), JSON.stringify(firstTicks));
    L.check('V1 all guessers scored each turn (scores > 0 for all)', A.gameOver && A.gameOver.finalScores.every(p => p.score > 0), JSON.stringify(A.gameOver && A.gameOver.finalScores.map(p => p.score)));
    L.closeAll(A, B, C);
  }
  { // V2: drawer leaves during PLAYING → turn ends, next player draws (no skip)
    const { A, B, C } = await room3(2, { B: { autoGuess: false }, C: { autoGuess: false } });
    A.s.emit('start_game');
    await L.waitFor(() => L.last(B)?.status === 'PLAYING' && L.last(B).currentDrawer === A.name, 15000);
    A.s.emit('leave_room');
    L.check('V2 turn ends when the drawer leaves', await L.waitFor(() => B.events.some(e => e.ev === 'round_end' && /drawer left/i.test(e.data.reason)), 3000));
    await L.waitFor(() => B.frames.some(f => f.status === 'WORD_SELECTION' && f.currentDrawer !== A.name), 8000);
    const next = B.frames.find(f => f.status === 'WORD_SELECTION' && f.currentDrawer !== A.name);
    L.check('V2 next drawer is B (next in order), round 1', next && next.currentDrawer === B.name && next.currentRound === 1, next && `${next.currentDrawer}@${next.currentRound}`);
    L.closeAll(A, B, C);
  }
  { // V3: an earlier player (A, index 0) leaves during ROUND_OVER → next drawer is still C
    const { A, B, C } = await room3(2);
    A.s.emit('start_game');
    await L.waitFor(() => L.last(C)?.status === 'ROUND_OVER' && L.last(C).currentDrawer === B.name, 40000);
    A.s.emit('leave_room');
    await L.waitFor(() => C.frames.some(f => f.status === 'WORD_SELECTION' && f.currentDrawer === C.name) || C.frames.filter(f => f.status === 'WORD_SELECTION').length >= 3, 8000);
    const next = C.frames.filter(f => f.status === 'WORD_SELECTION').pop();
    L.check('V3 earlier player leaves in ROUND_OVER → C draws next, round 1', next.currentDrawer === C.name && next.currentRound === 1, `${next.currentDrawer}@${next.currentRound}`);
    L.closeAll(A, B, C);
  }
  { // V4: the next (last) drawer leaves in ROUND_OVER → round closes, round 2 starts with first player
    const { A, B, C } = await room3(2);
    A.s.emit('start_game');
    await L.waitFor(() => L.last(A)?.status === 'ROUND_OVER' && L.last(A).currentDrawer === B.name, 40000);
    C.s.emit('leave_room');
    await L.waitFor(() => A.frames.some(f => f.status === 'WORD_SELECTION' && f.currentRound === 2), 8000);
    const next = A.frames.filter(f => f.status === 'WORD_SELECTION').pop();
    L.check('V4 next drawer left in ROUND_OVER → round 2 starts with A', next.currentDrawer === A.name && next.currentRound === 2, `${next.currentDrawer}@${next.currentRound}`);
    L.check('V4 no round > totalRounds', A.frames.every(f => f.currentRound <= f.totalRounds));
    L.closeAll(A, B, C);
  }
  { // V5: remaining guessers all correct after a non-guesser leaves → round ends immediately
    const { A, B, C } = await room3(1, { C: { autoGuess: false } });
    A.s.emit('start_game');
    await L.waitFor(() => L.last(A)?.status === 'PLAYING' && (L.last(A).correctGuessersCount === 1), 15000);
    C.s.emit('leave_room');
    L.check('V5 round ends when the only remaining guesser had guessed', await L.waitFor(() => A.frames.some(f => f.status === 'ROUND_OVER'), 3000));
    L.closeAll(A, B, C);
  }
  L.finish();
})();
