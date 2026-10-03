// T1-20: create_room `name` is cleaned by the server (control characters removed, trimmed, max
// GAME_RULES.ROOM_NAME_MAX_LENGTH code points; empty / non-string → "<host>'s Room"); the name reaches room_data and the
// room list; the seed room 83921 is listed with host GAME_RULES.PUBLIC_ROOM_HOST. Real server on TEST_PORT.
const path = require('path');
const L = require('../lib/e2e-lib');
const { GAME_RULES } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const MAX = GAME_RULES.ROOM_NAME_MAX_LENGTH;

async function created(name, username) {
  const A = L.player(username || L.nextName('N'));
  const payload = { name: 'E2E', username: A.name, gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60 };
  if (name === undefined) delete payload.name; else payload.name = name;
  const res = await L.emitAck(A.s, 'create_room', payload);
  await L.waitFor(() => L.last(A), 3000);
  const room = L.last(A);
  return { A, res, roomName: room && room.name };
}

(async () => {
  L.check(`setup: ROOM_NAME_MAX_LENGTH is 24`, MAX === 24, String(MAX));
  const cases = [
    ['plain name kept', 'Art Club', null, 'Art Club'],
    ['surrounding spaces trimmed', '   Art Club   ', null, 'Art Club'],
    ['overlong (40 chars) cut to 24', 'A'.repeat(40), null, 'A'.repeat(24)],
    ['24 chars kept exactly', 'B'.repeat(24), null, 'B'.repeat(24)],
    ['control characters removed (NUL, newline, tab, BEL, DEL, C1)', 'Bad\u0000\nNa\tme\u0007\u007f\u0085!', null, 'BadName!'],
    ['emoji / Thai counted per character, never split', '🎨'.repeat(30), null, '🎨'.repeat(24)],
    ['Thai name kept', 'ห้องวาดรูป', null, 'ห้องวาดรูป'],
    ['empty → "<host>\'s Room"', '', 'Mali', "Mali's Room"],
    ['spaces only → default', '      ', 'Mali', "Mali's Room"],
    ['control characters only → default', '\u0000\u0001\n', 'Mali', "Mali's Room"],
    ['name missing → default', undefined, 'Mali', "Mali's Room"],
    ['number → default', 12345, 'Mali', "Mali's Room"],
    ['object → default', { a: 1 }, 'Mali', "Mali's Room"],
    ['cut, then trailing space trimmed', 'x'.repeat(23) + ' yyy', null, 'x'.repeat(23)],
    ['long host name: default also cut to 24', '', 'H'.repeat(30), ('H'.repeat(30) + "'s Room").slice(0, 24)],
  ];
  const made = [];
  for (const [label, name, user, want] of cases) {
    const r = await created(name, user); // each case creates its own room, so a fixed username is fine
    L.check(`create_room name: ${label}`, r.res && r.res.success && r.roomName === want && Array.from(r.roomName).length <= MAX,
      `${JSON.stringify(r.roomName)} (want ${JSON.stringify(want)})`);
    made.push(r);
  }
  // the cleaned name is what the room list shows
  const P = L.player(L.nextName('P'));
  const listP = new Promise((res) => P.s.once('room_list_updated', res));
  P.s.emit('get_rooms');
  const list = await Promise.race([listP, L.sleep(3000).then(() => [])]);
  const mine = list.find((x) => x.code === made[2].res.code);
  L.check('room list shows the cleaned name (overlong case → 24 chars)', mine && mine.name === 'A'.repeat(24), mine && mine.name);
  const seed = list.find((x) => x.code === '83921');
  L.check('seed room 83921 listed with host = GAME_RULES.PUBLIC_ROOM_HOST (value unchanged: "System")', seed && seed.host === GAME_RULES.PUBLIC_ROOM_HOST && seed.host === 'System',
    seed && JSON.stringify({ name: seed.name, host: seed.host }));
  // joining by code still works and the joiner sees the same name
  const B = L.player(L.nextName('J'));
  const j = await L.join(B, made[0].res.code);
  await L.waitFor(() => L.last(B), 3000);
  L.check('join by code still works; joiner sees the room name', j && j.success && L.last(B) && L.last(B).name === 'Art Club', L.last(B) && L.last(B).name);
  L.closeAll(...made.map((r) => r.A), P, B);
  L.finish();
})();
