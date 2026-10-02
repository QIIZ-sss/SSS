// T1-11: the server keeps a chosen avatar from the shared AVATARS set and replaces anything else with the default.
const path = require('path');
const L = require('../lib/e2e-lib');
const { AVATARS } = require(path.join(__dirname, '..', '..', 'shared', 'gameConfig.js'));
const avatarOf = (p, name) => (L.last(p).players.find((x) => x.username === name) || {}).avatar;
(async () => {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B')), C = L.player(L.nextName('C'));
  const { code } = await L.makeRoom(A, { avatar: '🦁' });
  await new Promise((r) => B.s.emit('join_room', { code, username: B.name, avatar: '🚀' }, r));
  await new Promise((r) => C.s.emit('join_room', { code, username: C.name, avatar: 'NOT-AN-AVATAR-' + 'x'.repeat(200) }, r));
  await L.sleep(300);
  L.check('creator keeps a valid avatar (🦁)', avatarOf(A, A.name) === '🦁', avatarOf(A, A.name));
  L.check('joiner keeps a valid avatar (🚀)', avatarOf(A, B.name) === '🚀', avatarOf(A, B.name));
  L.check(`unknown avatar text replaced by the default (${AVATARS[0].emoji})`, avatarOf(A, C.name) === AVATARS[0].emoji, String(avatarOf(A, C.name)).slice(0, 20));
  const D = L.player(L.nextName('D'));
  await L.makeRoom(D, { avatar: '<img src=x>' }); await L.sleep(200);
  L.check('creator with an unknown avatar gets the default', avatarOf(D, D.name) === AVATARS[0].emoji, String(avatarOf(D, D.name)));
  L.closeAll(A, B, C, D);
  L.finish();
})();
