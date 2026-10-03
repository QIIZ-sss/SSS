// T1-02: game_over.finalScores is sorted by player score, highest first, in every mode (numeric, stable for ties,
// every player kept incl. 0 pts). Deterministic: the real RoundManager in-process with fixed scores (no server needed).
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const roomManager = require(path.join(ROOT, 'server/src/gameLogic/RoomManager.js'));
const TimerManager = require(path.join(ROOT, 'server/src/gameLogic/TimerManager.js'));
const RoundManager = require(path.join(ROOT, 'server/src/gameLogic/RoundManager.js'));

const results = [];
const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const log = [];
const io = { to: () => ({ emit: (ev, data) => log.push({ ev, data }) }), emit: () => {}, sockets: { sockets: new Map() } };

function gameOver(mode, players, teams) {
  log.length = 0;
  const tm = new TimerManager(io);
  const rnd = new RoundManager(roomManager, tm);
  const room = roomManager.createRoom(null, 'T', players[0].username, mode);
  players.forEach((p) => room.players.push({ socketId: null, avatar: '🐶', isReady: true, ...p }));
  if (teams) { room.teams.Red.score = teams.Red; room.teams.Blue.score = teams.Blue; }
  room.status = 'PLAYING';
  rnd.endGameMatch(io, room);
  tm.stopTimer(room.id); tm.clearTransition(room.id); // no GAME_OVER → LOBBY timer left behind
  roomManager.removeRoom(room.id);
  const go = log.find((e) => e.ev === 'game_over');
  return go ? go.data : null;
}
const row = (go) => (go ? go.finalScores.map((p) => `${p.username}:${p.score}`).join(' ') : 'no game_over');

// Team: Blue wins on team total, but Red's Ann has the top player score → Ann must rank #1 (old sort put Blue first)
const team = gameOver('TEAM', [
  { username: 'Ann', score: 900, team: 'Red' },
  { username: 'Bo', score: 500, team: 'Blue' },
  { username: 'Cy', score: 0, team: 'Red' },
  { username: 'Dee', score: 700, team: 'Blue' },
  { username: 'Eve', score: 600, team: 'Blue' },
], { Red: 900, Blue: 1800 });
check('Team: sorted by player score, not grouped by team', row(team) === 'Ann:900 Dee:700 Eve:600 Bo:500 Cy:0', row(team));
check('Team: winner text still from team totals', team && team.winnerText.includes('Blue'), team && team.winnerText);
check('Team: player with 0 pts is listed', team && team.finalScores.some((p) => p.username === 'Cy' && p.score === 0));

// FFA: ties keep join order; numeric (900 above 80, not string order); 0 pts kept
const ffa = gameOver('MULTIPLAYER_FFA', [
  { username: 'P1', score: 80 },
  { username: 'P2', score: 900 },
  { username: 'P3', score: 0 },
  { username: 'P4', score: 80 },
  { username: 'P5', score: 1000 },
]);
check('FFA: numeric score order, highest first, ties in join order', row(ffa) === 'P5:1000 P2:900 P1:80 P4:80 P3:0', row(ffa));
check('FFA: all 5 players listed incl. 0 pts', ffa && ffa.finalScores.length === 5);
check('FFA: winner text names #1', ffa && ffa.winnerText.includes('P5'), ffa && ffa.winnerText);

// Solo: single player, 0 pts still listed
const solo = gameOver('SOLO_AI', [{ username: 'Solo', score: 0 }]);
check('Solo: the only player is listed with 0 pts', row(solo) === 'Solo:0', row(solo));

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
