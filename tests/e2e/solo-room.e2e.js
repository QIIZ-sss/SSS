// Solo vs AI is a single-player room: not listed, nobody else can join, no switch to Solo with other players,
// starts with its one player without Ready. FFA / Team rules unchanged (p2.1 / p2.2 e2e).
const L = require('../lib/e2e-lib');
const listRooms = (p) => new Promise((r) => { p.s.once('room_list_updated', r); p.s.emit('get_rooms'); });
const listed = async (p, code) => (await listRooms(p)).some((room) => room.code === code);

(async () => {
  const watcher = L.player(L.nextName('W'));
  await L.sleep(300);

  { // 1 + 2: a Solo room is not listed and cannot be joined by PIN
    const A = L.player(L.nextName('S')), B = L.player(L.nextName('X'));
    const { code, success } = await L.makeRoom(A, { gameMode: 'SOLO_AI' });
    await L.sleep(200);
    L.check('Solo room created with its host', success && L.last(A).gameMode === 'SOLO_AI' && L.last(A).players.length === 1);
    L.check('Solo room is not in the public room list', !(await listed(watcher, code)));
    const res = await L.join(B, code); await L.sleep(300);
    L.check('second player joining the Solo room by PIN is rejected with a reason', res && res.success === false && /Solo/.test(res.message || ''), JSON.stringify(res));
    L.check('…and the Solo room still has only its host', L.last(A).players.length === 1 && B.frames.every((f) => f.code !== code));
    // 4: starts without Ready
    A.s.emit('start_game');
    const started = await L.waitFor(() => L.last(A).status === 'PLAYING', 3000);
    L.check('Solo with exactly 1 player starts without a Ready step', started, L.last(A).status);
    L.closeAll(A, B);
  }

  { // 3: switching to Solo is refused while other players are in the room
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code); await L.sleep(300);
    const chatsBefore = A.chats.length;
    A.s.emit('update_room_settings', { gameMode: 'SOLO_AI' }); await L.sleep(400);
    L.check('switch to SOLO_AI with 2 players is refused (room stays FFA)', L.last(A).gameMode === 'MULTIPLAYER_FFA' && L.last(B).gameMode === 'MULTIPLAYER_FFA', L.last(A).gameMode);
    const msg = A.chats.slice(chatsBefore).find((m) => m.isSystem);
    L.check('the host is told why (system message)', msg && /Solo vs AI is single-player/.test(msg.text), msg && msg.text);
    L.check('room is still listed', await listed(watcher, code));
    A.s.emit('update_room_settings', { gameMode: 'TEAM' }); await L.sleep(300);
    L.check('other mode switches still work with 2 players (TEAM)', L.last(A).gameMode === 'TEAM');
    // once alone, the host may switch to Solo; the room leaves the list and nobody can join
    B.s.emit('leave_room'); await L.sleep(400);
    A.s.emit('update_room_settings', { gameMode: 'SOLO_AI' }); await L.sleep(400);
    L.check('alone in the room, the host can switch to SOLO_AI', L.last(A).gameMode === 'SOLO_AI');
    L.check('after the switch the room is no longer listed', !(await listed(watcher, code)));
    const C = L.player(L.nextName('C'));
    const res = await L.join(C, code);
    L.check('…and a join by PIN is rejected', res && res.success === false, JSON.stringify(res));
    A.s.emit('update_room_settings', { gameMode: 'MULTIPLAYER_FFA' }); await L.sleep(300);
    L.check('switching back to FFA lists the room again', L.last(A).gameMode === 'MULTIPLAYER_FFA' && (await listed(watcher, code)));
    L.closeAll(A, B, C);
  }

  { // 5: FFA still needs Ready and 2 players
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A);
    A.s.emit('start_game'); await L.sleep(300);
    L.check('FFA alone still cannot start', L.last(A).status === 'LOBBY');
    await L.join(B, code); await L.sleep(200);
    A.s.emit('start_game'); await L.sleep(300);
    L.check('FFA with a guest not Ready still cannot start', L.last(A).status === 'LOBBY');
    B.s.emit('toggle_ready'); await L.sleep(200);
    A.s.emit('start_game');
    L.check('FFA with everyone Ready starts', await L.waitFor(() => L.last(A).status === 'WORD_SELECTION' || L.last(A).status === 'PLAYING', 3000));
    L.closeAll(A, B);
  }
  L.closeAll(watcher);
  L.finish();
})();
