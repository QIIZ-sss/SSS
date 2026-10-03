// U11 / U10: create_room uses the same settings rules as update_room_settings — numbers clamped to the same ranges
// (checked side by side), unknown challenge ID or unknown game mode → no room and { success: false, message }
// (a missing / non-function ack must not crash), valid creates unchanged. Real server on TEST_PORT.
const path = require('path');
const L = require('../lib/e2e-lib');
const { MINI_CHALLENGES } = require(path.join(__dirname, '..', '..', 'shared', 'gameConfig.js'));
const KNOWN = Object.values(MINI_CHALLENGES);
const pick = (d) => d && JSON.stringify({ t: d.roundTime, r: d.totalRounds, m: d.maxPlayers, ch: d.enabledChallenges, w: d.wordDifficulty });
const roomCount = (p) => new Promise((r) => { p.s.once('room_list_updated', (l) => r(l.length)); p.s.emit('get_rooms'); });
const alive = () => new Promise((r) => { const s = L.io(L.URL, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 2000 });
  s.on('connect', () => { s.close(); r(true); }); s.on('connect_error', () => { s.close(); r(false); }); });
async function create(settings, ack = true) {
  const P = L.player(L.nextName('C'));
  const payload = { username: P.name, ...settings };
  const res = ack ? await L.emitAck(P.s, 'create_room', payload) : (P.s.emit('create_room', payload, ...(ack === false ? [] : [ack])), null);
  await L.sleep(250);
  return { P, res, d: L.last(P) };
}

(async () => {
  { // valid creates are unchanged
    const { P, res, d } = await create({ name: 'Ok', gameMode: 'TEAM', roundTime: 45, totalRounds: 5, maxPlayers: 8, enabledChallenges: ['NONE', 'COLOUR_FIX'] });
    L.check('valid create_room → room with exactly those settings', res && res.success && d && d.gameMode === 'TEAM'
      && pick(d) === JSON.stringify({ t: 45, r: 5, m: 8, ch: ['NONE', 'COLOUR_FIX'], w: null }), pick(d));
    const m = await create({});
    L.check('create_room without settings → defaults (FFA, 60 s, 3 rounds, 10 players, all challenges, Mixed)', m.res.success && m.d.gameMode === 'MULTIPLAYER_FFA'
      && pick(m.d) === JSON.stringify({ t: 60, r: 3, m: 10, ch: KNOWN, w: null }), pick(m.d));
    const w = await create({ wordDifficulty: 'HARD' });
    L.check('create_room wordDifficulty HARD applied (same rule as update)', w.d && w.d.wordDifficulty === 'HARD', pick(w.d));
    L.closeAll(P, m.P, w.P);
  }

  { // numbers: create_room and update_room_settings give the same result for the same input
    const H = L.player(L.nextName('H')); await L.makeRoom(H);
    const cases = [{ roundTime: 5 }, { roundTime: 999 }, { roundTime: 0 }, { roundTime: -20 }, { totalRounds: -3 }, { totalRounds: 50 },
      { totalRounds: 0.5 }, { maxPlayers: 1 }, { maxPlayers: 100 }, { maxPlayers: 'x' }, { roundTime: '30' }, { wordDifficulty: 'SUPER' }, { wordDifficulty: null }];
    for (const c of cases) {
      H.s.emit('update_room_settings', { roundTime: 60, totalRounds: 3, maxPlayers: 10, wordDifficulty: null }); await L.sleep(150); // reset to defaults
      H.s.emit('update_room_settings', c); await L.sleep(250);
      const viaUpdate = pick(L.last(H));
      const { P, d } = await create(c);
      L.check(`same rule as update_room_settings for ${JSON.stringify(c)}`, d && pick(d) === viaUpdate, `create ${pick(d)} / update ${viaUpdate}`);
      L.closeAll(P);
    }
    L.closeAll(H);
  }

  { // rejected: unknown challenge ID or unknown mode → no room, safe error
    const Z = L.player(L.nextName('Z')); await L.sleep(300);
    const before = await roomCount(Z);
    const open = []; // keep every rejected socket connected until the room count is taken (a room would close with its last player)
    const bad = [
      ['unknown challenge ID', { enabledChallenges: ['NONE', 'HACKED'] }],
      ['non-string challenge ID', { enabledChallenges: [5] }],
      ['prototype name as challenge', { enabledChallenges: ['__proto__'] }],
      ['unknown game mode', { gameMode: 'XYZ' }],
      ['wrong-case game mode', { gameMode: 'team' }],
      ['number as game mode', { gameMode: 5 }],
      ['null game mode', { gameMode: null }],
    ];
    for (const [label, s] of bad) {
      const { P, res, d } = await create(s);
      L.check(`${label} → { success: false, message }, no room joined`, res && res.success === false && typeof res.message === 'string' && !res.roomId && !d,
        JSON.stringify(res));
      open.push(P);
    }
    for (const [label, ack] of [['no ack', false], ['non-function ack', 'not-a-function']]) {
      const { P, d } = await create({ gameMode: 'XYZ', enabledChallenges: ['HACKED'] }, ack);
      L.check(`invalid create_room with ${label} → no room, no crash`, !d && await alive() && P.s.connected);
      open.push(P);
    }
    const after = await roomCount(Z);
    L.check('no room was created by any rejected request (public room count unchanged, rejected sockets still connected)',
      after === before && open.every((p) => p.s.connected), `${before} → ${after}`);
    L.closeAll(Z, ...open);
  }
  L.finish();
})();
