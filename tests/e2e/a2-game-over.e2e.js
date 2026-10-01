// P1.4 A2 regression: real server on TEST_PORT (default 4100), real socket.io clients.
const path = require('path');
const { io } = require(path.join(__dirname, '..', '..', 'client', 'node_modules', 'socket.io-client'));
const URL = `http://127.0.0.1:${process.env.TEST_PORT || 4100}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let uid = 0;
const ORACLE = {};

// A player that auto-selects words and auto-guesses (uses the still-leaking currentWord, A1 not fixed yet).
function player(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const p = { s, name, frames: [], ticks: [], gameOver: null, guessed: new Set() };
  s.on('room_data', d => {
    p.frames.push({ t: Date.now(), ...d });
    // guess with the word the drawer chose (test oracle) — currentWord is no longer sent to guessers (P3.1)
    if (d.status === 'PLAYING' && d.currentDrawer !== name && ORACLE[d.code]) {
      const key = d.currentDrawer + ':' + d.currentRound;
      if (!p.guessed.has(key)) { p.guessed.add(key); s.emit('send_chat', { text: ORACLE[d.code] }); }
    }
  });
  s.on('timer_tick', d => p.ticks.push({ t: Date.now(), v: d.timeRemaining }));
  s.on('game_over', d => { p.gameOver = { t: Date.now(), ...d }; });
  s.on('word_selection', ({ words }) => { const f = p.frames[p.frames.length - 1]; if (f) ORACLE[f.code] = words[0]; s.emit('select_word', { word: words[0] }); });
  return p;
}
const emitAck = (s, ev, data) => new Promise(r => s.emit(ev, data, r));
const last = p => p.frames[p.frames.length - 1];
async function waitFor(fn, ms = 40000) { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await sleep(50); } return false; }

async function setupRoom(totalRounds) {
  const A = player('A' + (++uid)), B = player('B' + uid);
  const res = await emitAck(A.s, 'create_room', { name: 'P14', username: A.name, gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60 });
  await emitAck(B.s, 'join_room', { code: res.code, username: B.name });
  A.s.emit('update_room_settings', { totalRounds });
  B.s.emit('toggle_ready'); // P2.1: non-host players must be ready
  await sleep(300);
  return { A, B, code: res.code };
}

(async () => {
  // ---- R1: full game, timer stops, LOBBY reset, new game starts at Round 1 ----
  {
    const { A, B } = await setupRoom(1);
    A.s.emit('start_game');
    await waitFor(() => last(B)?.status === 'GAME_OVER');
    const goT = Date.now();
    check('R1 final round ends in GAME_OVER', last(B).status === 'GAME_OVER');
    check('R1 no room_data with currentRound > totalRounds', B.frames.every(f => f.currentRound <= f.totalRounds), `max=${Math.max(...B.frames.map(f => f.currentRound))}`);
    check('R1 scores kept during GAME_OVER', last(B).players.some(p => p.score > 0), JSON.stringify(last(B).players.map(p => p.username + ':' + p.score)));
    await waitFor(() => last(B)?.status === 'LOBBY');
    const ticksDuringGameOver = B.ticks.filter(t => t.t > goT + 50 && t.t < Date.now() - 50);
    check('R1 no timer_tick during GAME_OVER', ticksDuringGameOver.length === 0, `ticks=${ticksDuringGameOver.length}`);
    const lb = last(B);
    check('R1 LOBBY: round/score/ready/word reset', lb.currentRound === 0 && lb.players.every(p => p.score === 0 && !p.isReady) && lb.currentWord === '' && lb.currentDrawer === null);
    check('R1 game_over payload still holds final scores (modal data)', B.gameOver && B.gameOver.finalScores.some(p => p.score > 0));
    B.frames.length = 0;
    A.s.emit('start_game'); await sleep(1000);
    check('R1 new game requires Ready again (start rejected before Ready)', !B.frames.some(f => f.status === 'WORD_SELECTION'));
    B.s.emit('toggle_ready'); await sleep(200); // ready was reset in LOBBY (P1.4 / P2.1)
    A.s.emit('start_game');
    await waitFor(() => B.frames.some(f => f.status === 'WORD_SELECTION'));
    const first = B.frames.find(f => f.status === 'WORD_SELECTION');
    check('R1 new game begins at Round 1 with scores 0', first && first.currentRound === 1 && first.players.every(p => p.score === 0), first && `round=${first.currentRound}`);
    A.s.emit('leave_room'); B.s.emit('leave_room'); await sleep(200); A.s.close(); B.s.close();
  }

  // ---- R2: totalRounds = 2 → 4 turns, never 3/2 ----
  {
    const { A, B } = await setupRoom(2);
    A.s.emit('start_game');
    await waitFor(() => last(B)?.status === 'GAME_OVER', 60000);
    const turns = B.frames.filter(f => f.status === 'ROUND_OVER').length;
    check('R2 totalRounds=2: 4 turns then GAME_OVER', last(B).status === 'GAME_OVER' && turns === 4, `ROUND_OVER frames=${turns} players=${last(B).players.map(p=>p.username)}`);
    check('R2 never shows round > 2', B.frames.every(f => f.currentRound <= 2), `max=${Math.max(...B.frames.map(f => f.currentRound))}`);
    A.s.emit('leave_room'); B.s.emit('leave_room'); await sleep(200); A.s.close(); B.s.close();
  }

  // ---- R3: one player leaves during GAME_OVER (LEAVE ROOM button path), the other returns to LOBBY ----
  {
    const { A, B } = await setupRoom(1);
    A.s.emit('start_game');
    await waitFor(() => last(B)?.status === 'GAME_OVER');
    const goT = Date.now();
    A.s.emit('leave_room'); // host leaves
    await waitFor(() => last(B)?.status === 'LOBBY');
    const lb = last(B), gap = (Date.now() - goT) / 1000;
    check('R3 remaining player returns to LOBBY ~10 s after GAME_OVER', lb.status === 'LOBBY' && gap > 9 && gap < 11.5, `gap=${gap.toFixed(1)}s`);
    check('R3 host transferred to remaining player', lb.host === B.name && lb.players.length === 1, `host=${lb.host}`);
    B.s.emit('leave_room'); await sleep(200); A.s.close(); B.s.close();
  }

  // ---- R4: everyone leaves during GAME_OVER → room removed, no late callback, server alive ----
  {
    const { A, B, code } = await setupRoom(1);
    A.s.emit('start_game');
    await waitFor(() => last(B)?.status === 'GAME_OVER');
    A.s.emit('leave_room'); B.s.emit('leave_room');
    await sleep(11000); // past GAME_OVER_DELAY_MS
    const probe = player('probe' + uid);
    const list = await new Promise(r => { probe.s.once('room_list_updated', r); probe.s.emit('get_rooms'); });
    check('R4 emptied room removed from room list after GAME_OVER delay', !list.some(r => r.code === code), `rooms=${list.map(r => r.code + ':' + r.status).join(',')}`);
    check('R4 server still responsive', Array.isArray(list));
    probe.s.close(); A.s.close(); B.s.close();
  }

  console.log(results.join('\n'));
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`);
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
