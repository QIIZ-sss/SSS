// U11: update_room_settings rejects an enabledChallenges list containing any ID that is not in MINI_CHALLENGES —
// the whole update is ignored (room unchanged), the server does not crash, valid updates still work, and a started game
// only ever uses known challenges. Real server on TEST_PORT.
const path = require('path');
const L = require('../lib/e2e-lib');
const { MINI_CHALLENGES } = require(path.join(__dirname, '..', '..', 'shared', 'gameConfig.js'));
const KNOWN = Object.values(MINI_CHALLENGES);
const state = (p) => { const d = L.last(p); return JSON.stringify({ ch: d.enabledChallenges, t: d.roundTime, r: d.totalRounds, m: d.gameMode }); };

(async () => {
  const H = L.player(L.nextName('H')), G = L.player(L.nextName('G'));
  const { code } = await L.makeRoom(H); await L.join(G, code); await L.sleep(300);

  H.s.emit('update_room_settings', { enabledChallenges: ['NONE', 'COLOUR_FIX'] }); await L.sleep(300);
  L.check('valid list is applied (NONE, COLOUR_FIX)', JSON.stringify(L.last(G).enabledChallenges) === '["NONE","COLOUR_FIX"]', JSON.stringify(L.last(G).enabledChallenges));

  const bad = [
    ['unknown string', ['NONE', 'HACKED']],
    ['wrong case', ['none']],
    ['number', [5]],
    ['null', [null]],
    ['object', [{ id: 'NONE' }]],
    ['nested array', [['NONE']]],
    ['prototype name', ['toString']],
    ['__proto__', ['__proto__']],
    ['HTML string', ['<img src=x onerror=alert(1)>']],
  ];
  for (const [label, list] of bad) {
    const before = state(G);
    H.s.emit('update_room_settings', { enabledChallenges: list, roundTime: 90, totalRounds: 7 }); // other fields must not apply either
    await L.sleep(300);
    L.check(`unknown ID (${label}) → whole update rejected, room unchanged`, state(G) === before && state(H) === before, `${before} → ${state(G)}`);
  }
  const alive = await new Promise((r) => { const s = L.io(L.URL, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 2000 });
    s.on('connect', () => { s.close(); r(true); }); s.on('connect_error', () => { s.close(); r(false); }); });
  L.check('server still up, host still connected', alive && H.s.connected);

  H.s.emit('update_room_settings', { enabledChallenges: KNOWN, roundTime: 45 }); await L.sleep(300);
  L.check('valid update still works afterwards (all 4 known IDs + roundTime)', JSON.stringify(L.last(G).enabledChallenges) === JSON.stringify(KNOWN) && L.last(G).roundTime === 45,
    state(G));
  H.s.emit('update_room_settings', { roundTime: 60 }); await L.sleep(300);
  L.check('update without enabledChallenges is unaffected', L.last(G).roundTime === 60 && JSON.stringify(L.last(G).enabledChallenges) === JSON.stringify(KNOWN));

  // a game started after the rejected attempts only uses known challenges
  H.s.emit('update_room_settings', { totalRounds: 1, roundTime: 15 }); G.s.emit('toggle_ready'); await L.sleep(300);
  const t0 = Date.now();
  H.s.emit('start_game');
  await L.waitFor(() => H.events.some((e) => e.t >= t0 && e.ev === 'round_start'), 15000);
  const ch = H.events.filter((e) => e.t >= t0 && e.ev === 'round_start').map((e) => e.data.challenge);
  L.check('started game: every turn challenge is a known MINI_CHALLENGES ID', ch.length > 0 && ch.every((c) => KNOWN.includes(c)), ch.join(','));
  L.closeAll(H, G);
  L.finish();
})();
