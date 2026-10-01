// Shared helpers for e2e scripts (real server on TEST_PORT, default 4100; real socket.io-client).
const path = require('path');
const { io } = require(path.join(__dirname, '..', '..', 'client', 'node_modules', 'socket.io-client'));
const URL = `http://127.0.0.1:${process.env.TEST_PORT || 4100}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let uid = 0;
const ORACLE = {}; // room code -> current word chosen by the drawer

// opts.autoSelect: auto-pick first word when drawer; opts.autoGuess: guess using a provided word source
function player(name, opts = {}) {
  const s = io(URL, { transports: ['websocket'], forceNew: true, ...(opts.ioOpts || {}) });
  const p = { s, name, frames: [], chats: [], ticks: [], events: [], words: null, gameOver: null };
  s.onAny((ev, data) => p.events.push({ t: Date.now(), ev, data }));
  s.on('room_data', d => p.frames.push({ t: Date.now(), ...d }));
  s.on('chat_message', m => p.chats.push(m));
  s.on('timer_tick', d => p.ticks.push({ t: Date.now(), v: d.timeRemaining }));
  s.on('game_over', d => { p.gameOver = d; });
  s.on('word_selection', ({ words }) => {
    p.words = words;
    const code = p.frames.length ? p.frames[p.frames.length - 1].code : null;
    if (code) ORACLE[code] = words[0]; // server auto-picks words[0] on timeout too
    if (opts.autoSelect !== false) s.emit('select_word', { word: words[0] });
  });
  // Auto-guess using the word the drawer chose (test oracle) — does not rely on currentWord leaking.
  p.guessedTurns = new Set();
  s.on('room_data', d => {
    if (opts.autoGuess === false || p.noGuess) return;
    if (d.status !== 'PLAYING' || d.currentDrawer === name) return;
    const key = d.code + ':' + d.currentRound + ':' + d.currentDrawer;
    if (p.guessedTurns.has(key) || !ORACLE[d.code]) return;
    p.guessedTurns.add(key);
    setTimeout(() => s.emit('send_chat', { text: ORACLE[d.code] }), opts.guessDelay || 50);
  });
  return p;
}
const emitAck = (s, ev, data) => new Promise(r => s.emit(ev, data, r));
const last = p => p.frames[p.frames.length - 1];
async function waitFor(fn, ms = 40000) { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); }
const nextName = (prefix) => `${prefix}${++uid}_${process.pid % 1000}`;

async function makeRoom(host, extra = {}) {
  return emitAck(host.s, 'create_room', { name: 'E2E', username: host.name, gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, ...extra });
}
async function join(p, code) { return emitAck(p.s, 'join_room', { code, username: p.name }); }
function closeAll(...ps) { ps.forEach(p => { try { p.s.emit('leave_room'); p.s.close(); } catch (e) {} }); }
function finish() {
  console.log(results.join('\n'));
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`);
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
}
module.exports = { ORACLE, io, URL, sleep, check, player, emitAck, last, waitFor, nextName, makeRoom, join, closeAll, finish, results };
