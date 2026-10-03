// Security: empty / malformed socket payloads (and non-function acks) never crash the server or corrupt room state.
// Every handler that reads a payload is hit from a context that reaches its deeper code; afterwards a normal game still works.
const path = require('path');
const L = require('../lib/e2e-lib');
const { RATE_LIMITS } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const { SOCKET_EVENTS } = require(path.join(__dirname, '..', '..', 'shared', 'events.js'));
// U4: pace each event under its rate limit so every malformed payload still reaches the handler
const KEY = Object.fromEntries(Object.entries(SOCKET_EVENTS).map(([k, v]) => [v, k]));
const gap = (ev) => { const lim = RATE_LIMITS[KEY[ev]] || (RATE_LIMITS.DRAW.events.includes(KEY[ev]) ? RATE_LIMITS.DRAW : null);
  return lim ? Math.max(60, Math.ceil(lim.windowMs / lim.max) + 20) : 60; };
const NONE = Symbol('no payload');
const GENERIC = [NONE, null, 'str', 42, [1, 2], {}];
const label = (p) => (p === NONE ? 'no payload' : JSON.stringify(p).replace(/(\[(?:[^\[\],]*,){3})[^\]]{40,}\]/g, '$1…]'));
const fire = (p, ev, payload, ...extra) => (payload === NONE ? p.s.emit(ev) : p.s.emit(ev, payload, ...extra));
const alive = () => new Promise((r) => {
  const s = L.io(L.URL, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 2000 });
  s.on('connect', () => { s.close(); r(true); }); s.on('connect_error', () => { s.close(); r(false); });
});
// fire every payload, then check the server still accepts connections
async function hit(name, p, ev, payloads, extra = []) {
  for (const pl of payloads) { fire(p, ev, pl, ...extra); await L.sleep(gap(ev)); }
  await L.sleep(250);
  L.check(`${name}: ${ev} with ${payloads.map(label).join(' | ')}${extra.length ? ' + non-function ack' : ''} → server still up`, await alive());
}

// If the server dies, later steps would wait forever for acks: fail fast instead of hanging check_all.sh
setTimeout(() => { L.check('suite finished within 150 s (server unresponsive?)', false); L.finish(); }, 150000).unref();

(async () => {
  { // 1) not in a room: room entry handlers, also with a non-function ack
    const P = L.player(L.nextName('O')); await L.sleep(300);
    await hit('outsider', P, 'create_room', GENERIC.slice(0, 5)); // {} would create a valid room: tested below
    await hit('outsider', P, 'join_room', [...GENERIC, { code: { toString: 5 }, username: [], avatar: 7 }, { roomId: [] }]);
    await hit('outsider', P, 'rejoin_room', [...GENERIC, { code: 5, sessionId: {} }]);
    await hit('outsider', P, 'join_room', [{ code: '00000' }], ['not-a-function']);
    await hit('outsider', P, 'rejoin_room', [{ code: '00000', sessionId: 'x' }], ['not-a-function']);
    await hit('outsider', P, 'send_chat', GENERIC);
    await hit('outsider', P, 'switch_team', GENERIC);
    await hit('outsider', P, 'update_room_settings', GENERIC);
    for (const ev of ['draw_begin', 'draw_path', 'shape_preview', 'draw_end', 'draw_fill', 'select_word', 'solo_ai_predict']) await hit('outsider', P, ev, GENERIC);
    L.closeAll(P);
  }

  { // 2) create_room with wrong field types; also a non-function ack
    const P = L.player(L.nextName('C'));
    const WRONG = { username: 42, avatar: {}, name: { x: 1 }, roundTime: 'abc', totalRounds: -3, maxPlayers: [], enabledChallenges: 'abc', miniChallengeEnabled: 'yes' };
    // U11/U10: an unknown game mode → no room, safe error ack
    const rej = await new Promise((r) => P.s.emit('create_room', { ...WRONG, gameMode: 'XYZ' }, r));
    await L.sleep(300);
    L.check('create_room with an unknown gameMode → rejected with { success: false, message }, no room', rej && rej.success === false
      && typeof rej.message === 'string' && !L.last(P), JSON.stringify(rej));
    const res = await new Promise((r) => P.s.emit('create_room', WRONG, r));
    await L.sleep(300);
    const d = L.last(P);
    // same rules as update_room_settings: non-numbers ignored (defaults), -3 rounds clamped to 1, non-array challenge list ignored
    L.check('create_room with wrong types (no mode) → room created with safe defaults (FFA, 60 s, rounds clamped to 1, string name/username, all challenges)',
      res && res.success && d.gameMode === 'MULTIPLAYER_FFA' && d.roundTime === 60 && d.totalRounds === 1 && d.maxPlayers === 10
      && typeof d.name === 'string' && typeof d.host === 'string' && Array.isArray(d.enabledChallenges) && d.enabledChallenges.length === 4,
      JSON.stringify({ mode: d.gameMode, t: d.roundTime, r: d.totalRounds, max: d.maxPlayers, name: d.name, host: d.host, ch: d.enabledChallenges }));
    const Q = L.player(L.nextName('C'));
    Q.s.emit('create_room', { username: Q.name }, 'not-a-function'); await L.sleep(300);
    L.check('create_room with a non-function ack → room still created, server up', L.last(Q) && L.last(Q).host === Q.name && await alive());
    // (into Q's room: P's host fell back to the default name "Player", which a nameless joiner would also get — same-name slot rule)
    const J = L.player(L.nextName('J'));
    const joined = await new Promise((r) => J.s.emit('join_room', { code: Number(L.last(Q).code), username: {}, avatar: 7 }, r));
    await L.sleep(300);
    L.check('join_room with a numeric code and wrong-typed name/avatar → joins with a string name', joined && joined.success === true
      && L.last(Q).players.length === 2 && L.last(Q).players.every((p) => typeof p.username === 'string' && typeof p.avatar === 'string'),
      JSON.stringify(L.last(Q).players.map((p) => [p.username, p.avatar])));
    L.closeAll(P, Q, J);
  }

  { // 3) host in LOBBY: settings and team switch; nothing may change
    const H = L.player(L.nextName('H')), G = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(H, { gameMode: 'TEAM' }); await L.join(G, code); await L.sleep(300);
    const before = JSON.stringify((({ gameMode, roundTime, totalRounds, maxPlayers, wordDifficulty, enabledChallenges, players }) =>
      ({ gameMode, roundTime, totalRounds, maxPlayers, wordDifficulty, enabledChallenges, teams: players.map((p) => p.team) }))(L.last(H)));
    await hit('host in lobby', H, 'update_room_settings', [...GENERIC, { gameMode: 5, roundTime: 'x', totalRounds: {}, wordDifficulty: 7, maxPlayers: [],
      miniChallengeEnabled: 'x', enabledChallenges: 'x' }]);
    await hit('team player', G, 'switch_team', [...GENERIC, { team: 5 }, { team: {} }, { team: 'Green' }]);
    const after = JSON.stringify((({ gameMode, roundTime, totalRounds, maxPlayers, wordDifficulty, enabledChallenges, players }) =>
      ({ gameMode, roundTime, totalRounds, maxPlayers, wordDifficulty, enabledChallenges, teams: players.map((p) => p.team) }))(L.last(H)));
    L.check('malformed settings / team switches changed nothing', before === after, `${before} → ${after}`);
    L.closeAll(H, G);
  }

  { // 4) drawer in WORD_SELECTION, then drawer + guesser in a COLOUR_FIX turn
    const D = L.player(L.nextName('D'), { autoSelect: false }), G = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(D); await L.join(G, code);
    D.s.emit('update_room_settings', { enabledChallenges: ['COLOUR_FIX'] }); G.s.emit('toggle_ready'); await L.sleep(300);
    D.s.emit('start_game');
    await L.waitFor(() => D.words && L.last(D).status === 'WORD_SELECTION', 5000);
    await hit('drawer in WORD_SELECTION', D, 'select_word', [...GENERIC, { word: {} }, { word: [D.words[0]] }]);
    L.check('still WORD_SELECTION after malformed select_word', L.last(D).status === 'WORD_SELECTION');
    L.ORACLE[code] = D.words[0];
    D.s.emit('select_word', { word: D.words[0] });
    await L.waitFor(() => L.last(G).status === 'PLAYING', 3000);
    const t0 = Date.now();
    for (const ev of ['draw_begin', 'draw_path', 'shape_preview', 'draw_end', 'draw_fill']) await hit('drawer in a COLOUR_FIX turn', D, ev, GENERIC.slice(0, 5));
    const junk = G.events.filter((e) => e.t >= t0 && /^draw_|^shape_/.test(e.ev) && (e.data === null || typeof e.data !== 'object' || Array.isArray(e.data)));
    L.check('non-object draw payloads are not relayed to the guesser', junk.length === 0, junk.map((e) => `${e.ev}:${JSON.stringify(e.data)}`).join(' '));
    const history = await new Promise((r) => { G.s.once('draw_sync', r); G.s.emit('draw_sync'); });
    L.check('…nor stored in the draw_sync history', Array.isArray(history) && history.length === 0, JSON.stringify(history).slice(0, 120));
    D.s.emit('draw_begin', { x: 1, y: 2, color: '#000000', size: 5, tool: 'pen' }); await L.sleep(300);
    const valid = G.events.find((e) => e.t >= t0 && e.ev === 'draw_begin');
    L.check('a valid draw_begin is still relayed, with the COLOUR_FIX colour forced', valid && valid.data.x === 1 && valid.data.color === L.last(G).forcedColor,
      valid && JSON.stringify(valid.data));
    await hit('guesser in PLAYING', G, 'send_chat', [...GENERIC, { text: 5 }, { text: {} }, { text: [D.words[0]] }]);
    L.check('malformed chat did not count as a guess', !G.events.some((e) => e.ev === 'correct_guess'));
    G.s.emit('send_chat', { text: D.words[0] });
    L.check('a valid correct guess still scores', await L.waitFor(() => G.events.some((e) => e.ev === 'correct_guess'), 3000));
    L.closeAll(D, G);
  }

  { // 5) Solo drawer in PLAYING: prediction requests
    const S = L.player(L.nextName('S'));
    await L.makeRoom(S, { gameMode: 'SOLO_AI' }); await L.sleep(200);
    S.s.emit('start_game');
    await L.waitFor(() => L.last(S).status === 'PLAYING', 3000);
    const word = L.last(S).currentWord;
    await hit('solo drawer', S, 'solo_ai_predict', [...GENERIC, { targetWord: 5, pixels: 'x' }, { targetWord: word, pixels: new Array(784).fill('a') },
      { targetWord: word, pixels: new Array(10).fill(0) }]);
    L.check('no prediction result for malformed requests', !S.events.some((e) => e.ev === 'solo_ai_prediction_result'));
    L.closeAll(S);
  }

  { // 6) health: a normal client can still create, join and start a game
    const A = L.player(L.nextName('A')), B = L.player(L.nextName('B'));
    const created = await L.makeRoom(A); const joined = await L.join(B, created.code);
    B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    const started = await L.waitFor(() => ['WORD_SELECTION', 'PLAYING'].includes(L.last(A).status), 5000);
    L.check('after all malformed calls: create + join + start a game works', created.success && joined.success && started, L.last(A).status);
    L.closeAll(A, B);
  }
  L.finish();
})();
