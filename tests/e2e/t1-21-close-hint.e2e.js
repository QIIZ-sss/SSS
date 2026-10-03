// T1-21: personal "close" hint. Part 1 drives the real chat handler in-process with recording sockets and fixed answers
// (every threshold case, Team rule, routing, no leak); part 2 checks the same on the real server (TEST_PORT).
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const L = require('../lib/e2e-lib');
const roomManager = require(path.join(ROOT, 'server/src/gameLogic/RoomManager.js'));
const TimerManager = require(path.join(ROOT, 'server/src/gameLogic/TimerManager.js'));
const RoundManager = require(path.join(ROOT, 'server/src/gameLogic/RoundManager.js'));
const { setupChatHandlers, CLOSE_HINT } = require(path.join(ROOT, 'server/src/socket/chatHandler.js'));
const { normalizeGuess } = require(path.join(ROOT, 'shared/utils.js'));
const check = L.check;

// ---------- in-process harness: recording sockets, io.to(room) delivers to every player socket of the room ----------
const sockets = new Map();
const io = {
  sockets: { sockets },
  to: (roomId) => ({ emit: (ev, data) => { const r = roomManager.getRoom(roomId); (r ? r.players : []).forEach((p) => { const s = sockets.get(p.socketId); if (s) s.inbox.push({ ev, data }); }); } }),
  emit: () => {},
};
const tm = new TimerManager(io);
const rnd = new RoundManager(roomManager, tm);
function makeSocket(id, username, roomId) {
  const s = { id, data: { username, roomId }, inbox: [], handlers: {}, on(ev, fn) { this.handlers[ev] = fn; }, emit(ev, data) { this.inbox.push({ ev, data }); } };
  sockets.set(id, s); setupChatHandlers(io, s, tm, rnd);
  return s;
}
// a PLAYING turn with a fixed answer; FFA: A draws, B C guess; Team: A (Red) draws, C is A's teammate, B D guess (Blue)
function turn(answer, mode = 'MULTIPLAYER_FFA') {
  const room = roomManager.createRoom(null, 'T', 'A', mode);
  const names = mode === 'TEAM' ? [['A', 'Red'], ['B', 'Blue'], ['C', 'Red'], ['D', 'Blue']] : [['A', 'Red'], ['B', 'Red'], ['C', 'Red']];
  const s = {};
  names.forEach(([u, team]) => { s[u] = makeSocket(`${room.id}-${u}`, u, room.id); room.players.push({ socketId: s[u].id, username: u, avatar: '🐶', score: 0, isReady: true, team }); });
  Object.assign(room, { status: 'PLAYING', currentWord: answer, currentDrawer: 'A', correctGuessers: [], currentRound: 1, roundTime: 60 });
  tm.startTimer(room.id, 60, () => {});
  const say = (u, text) => { Object.values(s).forEach((x) => { x.inbox.length = 0; }); s[u].handlers.send_chat({ text }); };
  const chats = (u) => s[u].inbox.filter((e) => e.ev === 'chat_message').map((e) => e.data);
  const hinted = (u) => chats(u).some((m) => m.isSystem && m.text === CLOSE_HINT);
  const sawText = (u, text) => chats(u).some((m) => m.text === text);
  const done = () => { tm.stopTimer(room.id); tm.clearTransition(room.id); roomManager.removeRoom(room.id); };
  return { room, s, say, chats, hinted, sawText, done };
}
const others = (all, me) => all.filter((u) => u !== me);

// hint text itself never carries answer information
check('hint text is fixed and has no digits (no length / distance)', CLOSE_HINT === "You're close!" && !/\d/.test(CLOSE_HINT));

// thresholds (each: answer, guess, expected hint)
const CASES = [
  ['Cat', 'Cab', false, 'answer under 4 chars (3): 1 edit → no hint'],
  ['Cat', 'Ca', false, 'answer under 4 chars: missing letter → no hint'],
  ['Sun', 'Suns', false, 'answer under 4 chars: extra letter → no hint'],
  ['Moon', 'Moan', true, '4 chars: distance 1 (substitution) → hint'],
  ['Moon', 'Mon', true, '4 chars: distance 1 (deletion) → hint'],
  ['Moon', 'Mxxn', false, '4 chars: distance 2 → no hint'],
  ['Rabbit', 'Rabit', true, '6 chars: distance 1 → hint'],
  ['Penguin', 'Pengiun', false, '7 chars: distance 2 (swap) → no hint'],
  ['Penguin', 'Pengui', true, '7 chars: distance 1 → hint'],
  ['Elephant', 'Elephnt', true, '8 chars: distance 1 → hint'],
  ['Elephant', 'Elphnt', true, '8 chars: distance 2 → hint'],
  ['Elephant', 'Elhnt', false, '8 chars: distance 3 → no hint'],
  ['Eiffel Tower', 'eiffel towr', true, 'multi-word (12 incl. space): distance 1 on the full string → hint'],
  ['Eiffel Tower', 'eifel towr', true, 'multi-word: distance 2 on the full string → hint'],
  ['Eiffel Tower', 'eiffeltower', true, 'multi-word: missing space = distance 1 on the full string → hint'],
  ['Eiffel Tower', 'tower', false, 'multi-word: one correct word alone is not close (full string compared) → no hint'],
  ['Eiffel Tower', 'eiffel', false, 'multi-word: first word alone → no hint'],
  ['Moon', 'MOAN!!', true, 'normalizeGuess applied (case, punctuation) → hint'],
  ['Moon', 'hello', false, 'unrelated guess → no hint'],
];
for (const [answer, guess, want, label] of CASES) {
  const t = turn(answer);
  t.say('B', guess);
  const leaked = others(['A', 'B', 'C'], 'B').some((u) => t.sawText(u, guess) || t.hinted(u));
  const ok = t.hinted('B') === want && (want ? !leaked && t.sawText('B', guess) : true);
  check(`${label} [${answer} / ${guess}]`, ok, `hint=${t.hinted('B')}, others saw it=${leaked}`);
  t.done();
}

{ // routing + no leak, FFA
  const t = turn('Elephant');
  t.say('B', 'elephnt');
  check('hint reaches only the guesser (B), as a system chat_message', t.hinted('B') && t.chats('B').filter((m) => m.isSystem).length === 1);
  check('drawer (A) receives nothing for the close guess (no hint, no text)', t.chats('A').length === 0 && t.s.A.inbox.length === 0);
  check('other guesser (C) receives nothing (no hint, no close text)', t.chats('C').length === 0 && t.s.C.inbox.length === 0);
  check('close guess echoed to the sender only (so their own chat shows it)', t.chats('B').some((m) => m.sender === 'B' && m.text === 'elephnt'));
  const all = ['A', 'B', 'C'].flatMap((u) => t.s[u].inbox.map((e) => JSON.stringify(e.data)));
  check('no message to anyone contains the answer', !all.some((j) => /elephant/i.test(j)), all.join(' | '));
  t.say('B', 'banana');
  check('a far guess is still public chat (unchanged)', ['A', 'B', 'C'].every((u) => t.sawText(u, 'banana')) && !t.hinted('B'));
  const before = t.room.players.find((p) => p.username === 'B').score;
  t.say('B', 'ELEPHANT');
  const after = t.room.players.find((p) => p.username === 'B').score;
  check('exact answer still scores normally (+points, correct notice to all, CORRECT_GUESS to the guesser, no hint)',
    after > before && t.room.correctGuessers.includes('B') && ['A', 'C'].every((u) => t.chats(u).some((m) => m.isCorrectNotice))
      && t.s.B.inbox.some((e) => e.ev === 'correct_guess') && !t.hinted('B'), `${before} → ${after}`);
  t.say('B', 'elephnt');
  check('after guessing correctly: no hint; message only on the concealed channel (drawer + correct guessers)',
    !t.hinted('B') && !t.sawText('C', 'elephnt') && t.chats('A').some((m) => m.isConcealedChat));
  t.done();
}

{ // Team (T1-01): only the opposing (guessing) team gets hints; the drawing team's close guesses do not leak either
  const t = turn('Elephant', 'TEAM');
  t.say('C', 'elephnt'); // C is on the drawing team
  check('Team: drawing-team player (C) gets no hint', !t.hinted('C'));
  check('Team: drawing-team close guess is not shown to anyone else', ['A', 'B', 'D'].every((u) => !t.sawText(u, 'elephnt') && !t.hinted(u)));
  t.say('B', 'elephnt'); // B guesses (opposing team)
  check('Team: opposing-team guesser (B) gets the hint, nobody else', t.hinted('B') && ['A', 'C', 'D'].every((u) => !t.hinted(u) && !t.sawText(u, 'elephnt')));
  t.done();
}

// ---------- part 2: real server ----------
(async () => {
  const A = L.player(L.nextName('A'), { autoGuess: false }), B = L.player(L.nextName('B'), { autoGuess: false }), C = L.player(L.nextName('C'), { autoGuess: false });
  const { code } = await L.makeRoom(A); await L.join(B, code); await L.join(C, code);
  A.s.emit('update_room_settings', { wordDifficulty: 'HARD', totalRounds: 1 }); B.s.emit('toggle_ready'); C.s.emit('toggle_ready'); await L.sleep(300);
  A.s.emit('start_game');
  await L.waitFor(() => L.last(B) && L.last(B).status === 'PLAYING', 15000);
  const drawer = [A, B, C].find((p) => p.name === L.last(A).currentDrawer);
  const [g1, g2] = [A, B, C].filter((p) => p !== drawer);
  const answer = L.ORACLE[code];
  const n = normalizeGuess(answer);
  const close = n.slice(0, -1) + (n.endsWith('x') ? 'y' : 'x'); // one substitution (HARD words are ≥ 6 chars)
  const t0 = Date.now();
  g1.s.emit('send_chat', { text: close }); await L.sleep(500);
  const msgs = (p) => p.events.filter((e) => e.t >= t0 && e.ev === 'chat_message').map((e) => e.data);
  check(`live: guesser gets "${CLOSE_HINT}" for a 1-edit guess of a HARD word (${n.length} chars)`, msgs(g1).some((m) => m.isSystem && m.text === CLOSE_HINT));
  check('live: drawer and the other guesser get no hint and do not see the close guess', [drawer, g2].every((p) => !msgs(p).some((m) => m.text === CLOSE_HINT || m.text === close)));
  check('live: no chat_message to anyone contains the answer', ![A, B, C].some((p) => msgs(p).some((m) => normalizeGuess(String(m.text)).includes(n))));
  g1.s.emit('send_chat', { text: answer }); await L.sleep(500);
  check('live: the exact answer still scores', L.last(g1).players.find((p) => p.username === g1.name).score > 0 && msgs(g2).some((m) => m.isCorrectNotice));
  L.closeAll(A, B, C);
  L.finish();
})();
