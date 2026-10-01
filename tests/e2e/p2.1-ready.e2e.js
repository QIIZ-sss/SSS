// P2.1 (A4) ready validation + start only from LOBBY.
const L = require('../lib/e2e-lib');
(async () => {
  // T1: guest not ready → direct start_game does not start
  {
    const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code); await L.sleep(300);
    A.s.emit('start_game'); await L.sleep(1500);
    L.check('T1 start rejected while guest not ready', L.last(B).status === 'LOBBY', L.last(B).status);
    L.check('T1 host receives a system reason', A.chats.some(m => m.isSystem && /ready/i.test(m.text)), A.chats.map(m => m.text).pop());
    // T2: guest ready → start works
    B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    L.check('T2 start succeeds when all non-host players are ready', await L.waitFor(() => B.frames.some(f => f.status === 'WORD_SELECTION'), 3000));
    // T3: start during an active game is ignored (no restart)
    await L.waitFor(() => L.last(B).status === 'PLAYING', 12000);
    const roundChanges = B.events.filter(e => e.ev === 'round_change').length;
    A.s.emit('start_game'); await L.sleep(1000);
    L.check('T3 start_game during PLAYING ignored', L.last(B).status === 'PLAYING' && B.events.filter(e => e.ev === 'round_change').length === roundChanges);
    // T4: non-host start ignored
    L.closeAll(A, B);
  }
  // T4: non-host cannot start
  {
    const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
    B.s.emit('start_game'); await L.sleep(1000);
    L.check('T4 non-host start_game ignored', L.last(B).status === 'LOBBY');
    L.closeAll(A, B);
  }
  // T5: host's own ready state is not required
  {
    const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
    L.check('T5 host not ready', L.last(B).players.find(p => p.username === A.name).isReady === false);
    A.s.emit('start_game');
    L.check('T5 game starts with host not ready', await L.waitFor(() => B.frames.some(f => f.status === 'WORD_SELECTION'), 3000));
    L.closeAll(A, B);
  }
  // T6: Solo AI (host alone) still starts
  {
    const A = L.player(L.nextName('S'));
    await L.makeRoom(A, { gameMode: 'SOLO_AI' }); await L.sleep(300);
    A.s.emit('start_game');
    L.check('T6 Solo AI host alone can start', await L.waitFor(() => A.frames.some(f => f.status === 'WORD_SELECTION'), 3000));
    L.closeAll(A);
  }
  L.finish();
})();
