// T1-07: what a reloaded client gets back (rejoin_room with its session): drawing history and timer during PLAYING,
// the results during GAME_OVER; nothing stale once the room is back in LOBBY.
const L = require('../lib/e2e-lib');
const rejoin = async (name, code, sessionId) => {
  const P = L.player(name, { autoGuess: false });
  const res = await new Promise((r) => P.s.emit('rejoin_room', { code, sessionId }, r));
  await L.sleep(300);
  return { P, res };
};

(async () => {
  { // reload during PLAYING
    const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'), { autoGuess: false });
    const { code } = await L.makeRoom(A); const jb = await L.join(B, code);
    B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => L.last(B).status === 'PLAYING', 5000);
    A.s.emit('draw_begin', { x: 10, y: 10, color: '#000000', size: 5, tool: 'pen' });
    A.s.emit('draw_path', { x: 50, y: 60, color: '#000000', size: 5, tool: 'pen' });
    A.s.emit('draw_end', {});
    await L.sleep(1500);
    B.s.disconnect();
    const { P: B2, res } = await rejoin(B.name, code, jb.sessionId);
    const d = L.last(B2);
    L.check('reload in PLAYING: rejoined, still PLAYING', res && res.success && d && d.status === 'PLAYING', JSON.stringify(res));
    L.check('…the timer comes back with the remaining time (0 < t < roundTime)', d && d.timeRemaining > 0 && d.timeRemaining < 60, d && String(d.timeRemaining));
    const history = await new Promise((r) => { B2.s.once('draw_sync', r); B2.s.emit('draw_sync'); });
    L.check('…the drawing so far is restored (draw_sync history: begin, path, end)', Array.isArray(history) && history.map((e) => e.type).join() === 'begin,path,end',
      JSON.stringify((history || []).map((e) => e.type)));
    L.check('…no game_over sent outside GAME_OVER', !B2.events.some((e) => e.ev === 'game_over'));
    L.closeAll(A, B2);
  }
  { // reload during GAME_OVER
    const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'));
    const { code } = await L.makeRoom(A, { totalRounds: 1 }); const jb = await L.join(B, code);
    B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    const over = await L.waitFor(() => B.gameOver, 40000);
    B.s.disconnect();
    const { P: B2, res } = await rejoin(B.name, code, jb.sessionId);
    const g = B2.events.find((e) => e.ev === 'game_over');
    L.check('reload in GAME_OVER: the results are sent again', over && res && res.success && g
      && JSON.stringify(g.data.finalScores) === JSON.stringify(B.gameOver.finalScores) && g.data.winnerText === B.gameOver.winnerText,
      g ? g.data.winnerText : 'no game_over after rejoin');
    await L.waitFor(() => L.last(B2).status === 'LOBBY', 12000);
    B2.s.disconnect();
    const { P: B3 } = await rejoin(B.name, code, jb.sessionId); // the session stays valid while the player is in the room
    L.check('back in LOBBY: a later reload gets no stale results', L.last(B3) && L.last(B3).status === 'LOBBY' && !B3.events.some((e) => e.ev === 'game_over'),
      L.last(B3) && L.last(B3).status);
    L.closeAll(A, B3);
  }
  L.finish();
})();
