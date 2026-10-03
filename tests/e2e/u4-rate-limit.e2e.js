// U4: per-socket rate limits (RATE_LIMITS in shared/contract.js). Normal fast drawing is never dropped; bursts of the
// strictly limited events are cut at `max` per window, silently (no ack, no error, no disconnect); limits are per socket;
// the event works again once the window has passed. Real server on TEST_PORT.
const path = require('path');
const L = require('../lib/e2e-lib');
const { RATE_LIMITS } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const R = RATE_LIMITS;
const since = (p, t0, ev) => p.events.filter((e) => e.t >= t0 && e.ev === ev);
const connected = (...ps) => ps.every((p) => p.s.connected);
// how many times a value seen by `p` in room_data changed since t0 (one change per applied toggle / switch)
const changes = (p, t0, pick) => { const v = p.frames.filter((f) => f.t >= t0).map(pick); let n = 0; for (let i = 1; i < v.length; i++) if (v[i] !== v[i - 1]) n++; return n; };
// fire n acked emits at once; resolves with how many acks came back within `ms`
const burstAcks = (p, ev, n, payload, ms = 1500) => new Promise((res) => {
  let acks = 0;
  for (let i = 0; i < n; i++) p.s.emit(ev, typeof payload === 'function' ? payload(i) : payload, () => { acks++; });
  setTimeout(() => res(acks), ms);
});
// a 2-player room in PLAYING with D drawing
async function playingRoom() {
  const D = L.player(L.nextName('D'), { autoSelect: false }), G = L.player(L.nextName('G'), { autoGuess: false });
  const { code } = await L.makeRoom(D, { roundTime: 60 }); await L.join(G, code);
  D.s.emit('update_room_settings', { enabledChallenges: ['NONE'] }); G.s.emit('toggle_ready'); await L.sleep(300);
  D.s.emit('start_game');
  await L.waitFor(() => D.words && L.last(D).status === 'WORD_SELECTION', 5000);
  D.s.emit('select_word', { word: D.words[0] });
  await L.waitFor(() => L.last(G).status === 'PLAYING', 3000);
  return { D, G, code };
}

(async () => {
  L.check('setup: RATE_LIMITS loaded from shared/contract.js', !!(R && R.SEND_CHAT && R.DRAW && R.DRAW.max >= 300),
    Object.entries(R).map(([k, v]) => `${k}=${v.max}/${v.windowMs}ms`).join(' '));

  { // drawing: realistic bursts must arrive complete
    const { D, G } = await playingRoom();
    let t0 = Date.now();
    D.s.emit('draw_begin', { x: 0, y: 0, color: '#000', size: 4 });
    for (let i = 0; i < 180; i++) { D.s.emit('draw_path', { x: i, y: i % 50 }); await L.sleep(1000 / 60); } // 60/s for 3 s
    D.s.emit('draw_end', {});
    await L.sleep(600);
    const got = since(G, t0, 'draw_path').length;
    L.check('drawing 60/s for 3 s: all 180 draw_path relayed to the guesser (none dropped)', got === 180 && since(G, t0, 'draw_begin').length === 1
      && since(G, t0, 'draw_end').length === 1, `${got}/180 path, begin ${since(G, t0, 'draw_begin').length}, end ${since(G, t0, 'draw_end').length}`);
    await L.sleep(R.DRAW.windowMs);
    t0 = Date.now();
    for (let i = 0; i < 240; i++) { D.s.emit('draw_path', { x: i, y: 1 }); if (i % 4 === 3) await L.sleep(16); } // ~240/s fast pointer for 1 s
    await L.sleep(600);
    L.check('fast pointer ~240/s for 1 s: all 240 draw_path relayed', since(G, t0, 'draw_path').length === 240, `${since(G, t0, 'draw_path').length}/240`);
    await L.sleep(R.DRAW.windowMs);
    t0 = Date.now();
    const flood = R.DRAW.max + 400;
    for (let i = 0; i < flood; i++) D.s.emit('shape_preview', { tool: 'line', x: i });
    await L.sleep(800);
    const relayed = since(G, t0, 'shape_preview').length;
    L.check(`flood of ${flood} drawing events at once: capped at DRAW.max (${R.DRAW.max}), drawer still connected`,
      relayed === R.DRAW.max && connected(D, G), `${relayed} relayed`);
    await L.sleep(R.DRAW.windowMs + 100);
    t0 = Date.now();
    D.s.emit('draw_path', { x: 1, y: 1 }); await L.sleep(300);
    L.check('drawing works again after the window', since(G, t0, 'draw_path').length === 1);
    L.closeAll(D, G);
  }

  { // send_chat: strict, per socket, recovers after the window
    const A = L.player(L.nextName('A')), B = L.player(L.nextName('B')), C = L.player(L.nextName('C'));
    const { code } = await L.makeRoom(A); await L.join(B, code); await L.join(C, code); await L.sleep(300);
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) B.s.emit('send_chat', { text: `spam ${i}` });
    await L.sleep(600);
    const fromB = () => A.chats.filter((m) => m.sender === B.name && /^spam/.test(m.text)).length;
    L.check(`send_chat: 20 at once → ${R.SEND_CHAT.max} delivered, rest dropped silently, sender still connected`,
      fromB() === R.SEND_CHAT.max && connected(B), `${fromB()} delivered`);
    C.s.emit('send_chat', { text: 'hello from C' }); await L.sleep(400);
    L.check('limits are per socket: another player can still chat', A.chats.some((m) => m.sender === C.name && m.text === 'hello from C'));
    await L.sleep(Math.max(0, R.SEND_CHAT.windowMs - (Date.now() - t0)) + 100);
    B.s.emit('send_chat', { text: 'back again' }); await L.sleep(400);
    L.check('send_chat works again after the window', A.chats.some((m) => m.sender === B.name && m.text === 'back again'));

    // toggle_ready: 2 × max + 5 flips at once → only max applied (even count → back to not ready)
    const n = 2 * R.TOGGLE_READY.max + 5;
    const before = L.last(A).players.find((p) => p.username === C.name).isReady;
    const tr = Date.now() - 1; A.frames.push({ ...L.last(A), t: tr }); // baseline frame
    for (let i = 0; i < n; i++) C.s.emit('toggle_ready');
    await L.sleep(800);
    const after = L.last(A).players.find((p) => p.username === C.name).isReady;
    const flips = changes(A, tr, (f) => f.players.find((p) => p.username === C.name).isReady);
    L.check(`toggle_ready: ${n} at once → exactly ${R.TOGGLE_READY.max} applied`, flips === R.TOGGLE_READY.max
      && after === (R.TOGGLE_READY.max % 2 === 0 ? before : !before) && connected(C), `${flips} flips seen, ready ${before} → ${after}`);

    // update_room_settings: values 20, 21, … → the last applied one is 20 + max - 1
    const m = R.UPDATE_ROOM_SETTINGS.max + 10;
    for (let i = 0; i < m; i++) A.s.emit('update_room_settings', { roundTime: 20 + i });
    await L.sleep(800);
    L.check(`update_room_settings: ${m} at once → first ${R.UPDATE_ROOM_SETTINGS.max} applied (roundTime ${20 + R.UPDATE_ROOM_SETTINGS.max - 1})`,
      L.last(B).roundTime === 20 + R.UPDATE_ROOM_SETTINGS.max - 1 && connected(A), String(L.last(B).roundTime));
    L.closeAll(A, B, C);
  }

  { // switch_team: alternate teams → only max switches applied
    const H = L.player(L.nextName('H')), T = L.player(L.nextName('T'));
    const { code } = await L.makeRoom(H, { gameMode: 'TEAM' }); await L.join(T, code); await L.sleep(300);
    const start = L.last(H).players.find((p) => p.username === T.name).team;
    const other = start === 'Red' ? 'Blue' : 'Red';
    const n = R.SWITCH_TEAM.max + 6;
    const ts = Date.now() - 1; H.frames.push({ ...L.last(H), t: ts }); // baseline frame
    for (let i = 0; i < n; i++) T.s.emit('switch_team', { team: i % 2 === 0 ? other : start });
    await L.sleep(800);
    const want = (R.SWITCH_TEAM.max - 1) % 2 === 0 ? other : start; // team of the last applied (max-th) switch
    const sw = changes(H, ts, (f) => f.players.find((p) => p.username === T.name).team);
    L.check(`switch_team: ${n} at once → exactly ${R.SWITCH_TEAM.max} applied`, sw === R.SWITCH_TEAM.max
      && L.last(H).players.find((p) => p.username === T.name).team === want && connected(T),
      `${sw} switches seen, ${start} → ${L.last(H).players.find((p) => p.username === T.name).team} (want ${want})`);
    L.closeAll(H, T);
  }

  { // select_word: a flood of forged words uses up the limit; the real pick is dropped until the window passes
    const D = L.player(L.nextName('D'), { autoSelect: false }), G = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(D); await L.join(G, code);
    G.s.emit('toggle_ready'); await L.sleep(300);
    D.s.emit('start_game');
    await L.waitFor(() => D.words && L.last(D).status === 'WORD_SELECTION', 5000);
    const t0 = Date.now();
    for (let i = 0; i < R.SELECT_WORD.max; i++) D.s.emit('select_word', { word: `forged${i}` });
    D.s.emit('select_word', { word: D.words[0] }); // over the limit → dropped
    await L.sleep(600);
    L.check(`select_word: after ${R.SELECT_WORD.max} forged picks the real pick is dropped (still WORD_SELECTION), drawer connected`,
      L.last(D).status === 'WORD_SELECTION' && connected(D), L.last(D).status);
    await L.sleep(Math.max(0, R.SELECT_WORD.windowMs - (Date.now() - t0)) + 100);
    if (L.last(D).status === 'WORD_SELECTION') D.s.emit('select_word', { word: D.words[0] });
    await L.waitFor(() => L.last(D).status === 'PLAYING', 3000);
    L.check('select_word works again after the window (offered word → PLAYING)', L.last(D).status === 'PLAYING', L.last(D).status);
    L.closeAll(D, G);
  }

  { // acked room-entry events: over the limit there is no ack at all (silent drop), the socket stays connected
    const P = L.player(L.nextName('P'));
    await L.sleep(300);
    const n = R.JOIN_ROOM.max + 5;
    const j = await burstAcks(P, 'join_room', n, { code: '00000', username: P.name });
    L.check(`join_room: ${n} at once → ${R.JOIN_ROOM.max} acks, rest silently dropped`, j === R.JOIN_ROOM.max && connected(P), `${j} acks`);
    const rj = await burstAcks(P, 'rejoin_room', R.REJOIN_ROOM.max + 5, { code: '00000', sessionId: 'x' });
    L.check(`rejoin_room: ${R.REJOIN_ROOM.max + 5} at once → ${R.REJOIN_ROOM.max} acks`, rj === R.REJOIN_ROOM.max && connected(P), `${rj} acks`);
    const C = L.player(L.nextName('C'));
    await L.sleep(300);
    const c = await burstAcks(C, 'create_room', R.CREATE_ROOM.max + 3, (i) => ({ name: `R${i}`, username: C.name }));
    L.check(`create_room: ${R.CREATE_ROOM.max + 3} at once → ${R.CREATE_ROOM.max} rooms created, rest dropped`, c === R.CREATE_ROOM.max && connected(C), `${c} acks`);
    const Q = L.player(L.nextName('Q'));
    const ok = await L.makeRoom(Q);
    L.check('another socket can still create a room (per-socket limit)', ok && ok.success === true);
    L.closeAll(P, C, Q);
  }

  { // server still accepts new connections
    const Z = L.player(L.nextName('Z'));
    const ok = await L.waitFor(() => Z.s.connected, 3000);
    L.check('server still up and accepting connections', ok);
    L.closeAll(Z);
  }
  L.finish();
})();
