// P2.2 (A5) minimum players for FFA / Team.
const L = require('../lib/e2e-lib');
const started = p => p.frames.some(f => f.status === 'WORD_SELECTION');
(async () => {
  { // U1: FFA host alone
    const A = L.player(L.nextName('H'));
    await L.makeRoom(A); await L.sleep(300);
    A.s.emit('start_game'); await L.sleep(1000);
    L.check('U1 FFA with 1 player cannot start', !started(A));
    L.check('U1 reason sent to host', A.chats.some(m => m.isSystem && /at least/i.test(m.text)), A.chats.map(m => m.text).pop());
    L.closeAll(A);
  }
  { // U2: TEAM room, host alone → reject; second player joins (auto-balanced) → start
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A, { gameMode: 'TEAM' }); await L.sleep(300);
    A.s.emit('start_game'); await L.sleep(1000);
    L.check('U2 TEAM with empty Blue team cannot start', !started(A));
    await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
    const teams = L.last(A).players.map(p => p.team).sort().join(',');
    L.check('U2 join balances teams', teams === 'Blue,Red', teams);
    A.s.emit('start_game');
    L.check('U2 TEAM with 1 per team starts', await L.waitFor(() => started(A), 3000));
    L.closeAll(A, B);
  }
  { // U3: both on the same team → reject
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A, { gameMode: 'TEAM' }); await L.join(B, code);
    B.s.emit('switch_team', { team: 'Red' }); B.s.emit('toggle_ready'); await L.sleep(400);
    A.s.emit('start_game'); await L.sleep(1000);
    L.check('U3 TEAM with both players on Red cannot start (direct emit)', !started(A));
    L.closeAll(A, B);
  }
  { // U4: FFA room with 2 players switched to TEAM → teams rebalanced → can start
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code); await L.sleep(200);
    A.s.emit('update_room_settings', { gameMode: 'TEAM' }); B.s.emit('toggle_ready'); await L.sleep(400);
    const teams = L.last(A).players.map(p => p.team).sort().join(',');
    L.check('U4 switching FFA→TEAM rebalances teams', teams === 'Blue,Red', teams);
    A.s.emit('start_game');
    L.check('U4 rebalanced TEAM room starts', await L.waitFor(() => started(A), 3000));
    L.closeAll(A, B);
  }
  { // U5: FFA with 2 ready players starts (regression)
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    L.check('U5 FFA with 2 ready players starts', await L.waitFor(() => started(A), 3000));
    L.closeAll(A, B);
  }
  L.finish();
})();
