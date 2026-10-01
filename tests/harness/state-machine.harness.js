// P1.3 state-machine harness: loads the real live server modules with a fake clock and fake io.
const path = require('path');
// HARNESS_ROOT lets tests/negative-control run this against an old commit checked out elsewhere
const ROOT = process.env.HARNESS_ROOT || path.join(__dirname, '..', '..');

// ---- fake clock ----
let now = 0, seq = 0;
const timers = new Map();
global.setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn, every: 0 }); return id; };
global.clearTimeout = (id) => timers.delete(id);
global.setInterval = (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn, every: ms }); return id; };
global.clearInterval = (id) => timers.delete(id);
function advance(ms) {
  const end = now + ms;
  for (;;) {
    let nextId = null, next = null;
    for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next.at)) { next = t; nextId = id; }
    if (!next) break;
    now = next.at;
    if (next.every) next.at += next.every; else timers.delete(nextId);
    next.fn();
  }
  now = end;
}

// ---- fake io ----
const log = [];
const io = {
  to: () => ({ emit: (ev, data) => log.push({ t: now, ev, data }) }),
  emit: (ev, data) => log.push({ t: now, ev, data, global: true }),
  sockets: { sockets: new Map([
    ['s1', { emit: () => {} }],                                        // player A (view not logged)
    ['s2', { emit: (ev, data) => log.push({ t: now, ev, data }) }],    // player B's per-player view
  ]) },
};

const roomManager = require(path.join(ROOT, 'server/src/gameLogic/RoomManager.js'));
const TimerManager = require(path.join(ROOT, 'server/src/gameLogic/TimerManager.js'));
const RoundManager = require(path.join(ROOT, 'server/src/gameLogic/RoundManager.js'));

const results = [];
const check = (name, cond, detail = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

function newGame(totalRounds) {
  log.length = 0;
  const tm = new TimerManager(io);
  const rnd = new RoundManager(roomManager, tm);
  const room = roomManager.createRoom(null, 'T', 'A', 'MULTIPLAYER_FFA', { totalRounds });
  room.players.push({ socketId: 's1', username: 'A', score: 0, isReady: true, team: 'Red' });
  room.players.push({ socketId: 's2', username: 'B', score: 0, isReady: true, team: 'Red' });
  // same steps as gameHandler START_GAME
  room.currentRound = 1; room.drawerIndex = 0;
  room.players.forEach(p => { p.score = 0; });
  rnd.startTurnSelection(io, room);
  return { tm, rnd, room };
}

// ---------- Scenario 1: full 3-round game, 2 players ----------
{
  const { tm, rnd, room } = newGame(3);
  const maxRoundSeen = () => Math.max(...log.filter(e => e.ev === 'room_data').map(e => e.data.currentRound));
  let turns = 0;
  while (room.status !== 'GAME_OVER' && turns < 20) {
    advance(10_000);               // WORD_SELECTION auto-pick
    room.players[1].score += 100;  // give B points so final scores are non-zero
    rnd.endRound(io, room, 'test'); // end turn early
    turns++;
    advance(4_000);                // ROUND_OVER pause
  }
  check('S1 game reaches GAME_OVER after 6 turns (2 players x 3 rounds)', room.status === 'GAME_OVER' && turns === 6, `turns=${turns}`);
  check('S1 no room_data ever has currentRound > totalRounds', maxRoundSeen() <= 3, `max=${maxRoundSeen()}`);
  const go = log.find(e => e.ev === 'game_over');
  check('S1 game_over payload carries final scores', !!go && go.data.finalScores.some(p => p.score > 0), JSON.stringify(go && go.data.finalScores.map(p => p.score)));
  const lastRD = log.filter(e => e.ev === 'room_data').pop();
  check('S1 GAME_OVER room_data keeps scores and currentRound=3', lastRD.data.status === 'GAME_OVER' && lastRD.data.currentRound === 3 && lastRD.data.players.some(p => p.score > 0));
  check('S1 no timer_tick interval running during GAME_OVER', tm.roomTimers.size === 0);

  advance(9_999);
  check('S1 still GAME_OVER at 9.999 s', room.status === 'GAME_OVER');
  advance(1);
  check('S1 LOBBY at exactly 10 s', room.status === 'LOBBY');
  const rd = log.filter(e => e.ev === 'room_data').pop().data;
  check('S1 LOBBY room_data reset (round 0, scores 0, ready false, word empty)',
    rd.status === 'LOBBY' && rd.currentRound === 0 && rd.players.every(p => p.score === 0 && p.isReady === false) && rd.currentWord === '' && rd.currentDrawer === null,
    JSON.stringify({ r: rd.currentRound, s: rd.players.map(p => p.score), ready: rd.players.map(p => p.isReady) }));
  check('S1 room_list_updated emitted on LOBBY', log.some(e => e.ev === 'room_list_updated' && e.global));
  check('S1 no pending transitions/timers after LOBBY', tm.roomTimers.size === 0 && (tm.roomTransitions ? tm.roomTransitions.size : 0) === 0);
  advance(60_000);
  check('S1 nothing fires after LOBBY (status stays LOBBY)', room.status === 'LOBBY');

  // new game starts at Round 1
  room.currentRound = 1; room.drawerIndex = 0; rnd.startTurnSelection(io, room);
  const rc = log.filter(e => e.ev === 'round_change').pop().data;
  check('S1 new game starts at Round 1', rc.currentRound === 1 && room.status === 'WORD_SELECTION');
  tm.stopTimer(room.id);
  roomManager.removeRoom(room.code);
}

// ---------- Scenario 2: room emptied during GAME_OVER (gameHandler empty-room path calls stopTimer) ----------
{
  const { tm, rnd, room } = newGame(1);
  advance(10_000); rnd.endRound(io, room); advance(4_000);
  advance(10_000); rnd.endRound(io, room); advance(4_000);
  check('S2 reached GAME_OVER', room.status === 'GAME_OVER');
  check('S2 GAME_OVER transition pending', (tm.roomTransitions ? tm.roomTransitions.has(room.id) : false));
  room.players = [];
  tm.stopTimer(room.id);           // what handlePlayerLeave does when room becomes empty (gameHandler.js:209)
  check('S2 pending GAME_OVER timeout cleared on empty room', !(tm.roomTransitions ? tm.roomTransitions.has(room.id) : false));
  const before = log.length;
  advance(30_000);
  check('S2 no callback fires after room emptied', log.length === before && room.status === 'GAME_OVER');
  roomManager.removeRoom(room.code);
}

// ---------- Scenario 3: room emptied during ROUND_OVER (old stale-timeout bug) ----------
{
  const { tm, rnd, room } = newGame(3);
  advance(10_000); rnd.endRound(io, room);
  check('S3 ROUND_OVER transition pending', (tm.roomTransitions ? tm.roomTransitions.has(room.id) : false));
  room.players = []; tm.stopTimer(room.id); room.status = 'LOBBY'; // seeded-room empty path
  advance(30_000);
  check('S3 stale ROUND_OVER timeout did not turn empty room into GAME_OVER', room.status === 'LOBBY');
  roomManager.removeRoom(room.code);
}

// ---------- Scenario 4: START pressed during GAME_OVER clears the pending LOBBY transition ----------
{
  const { tm, rnd, room } = newGame(1);
  advance(10_000); rnd.endRound(io, room); advance(4_000);
  advance(10_000); rnd.endRound(io, room); advance(4_000);
  check('S4 reached GAME_OVER', room.status === 'GAME_OVER');
  room.currentRound = 1; room.drawerIndex = 0; rnd.startTurnSelection(io, room); // START_GAME
  advance(10_000 + 1); // past where GAME_OVER timeout would have fired; auto-pick moves to PLAYING
  check('S4 stale GAME_OVER timeout did not force LOBBY mid-game', room.status === 'PLAYING', room.status);
  tm.stopTimer(room.id);
  roomManager.removeRoom(room.code);
}

console.log(results.join('\n'));
console.log(`\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
