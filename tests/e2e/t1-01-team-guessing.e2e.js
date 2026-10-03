// T1-01: Team mode — the drawing team draws, the OPPOSING team guesses. The drawer's teammates cannot guess
// (no points, answer not broadcast); scoring counts the opposing team only; the round ends as soon as every
// opposing guesser is correct.
const path = require('path');
const L = require('../lib/e2e-lib');
const { calculateDrawerScore } = require(path.join(__dirname, '..', '..', 'shared', 'utils'));
const team = (p) => L.last(p).teams;
const scoreOf = (p, name) => (L.last(p).players.find((x) => x.username === name) || {}).score;
const saw = (p, word, since) => p.chats.slice(since).some((m) => typeof m.text === 'string' && m.text.toLowerCase().includes(word.toLowerCase()) && !m.isSystem);

(async () => {
  // join order → Red, Blue, Red, Blue (auto-balance, T1-15)
  const ps = ['A', 'B', 'C', 'D'].map((n) => L.player(L.nextName(n), { autoGuess: false }));
  const [A, B, C, D] = ps;
  const { code } = await L.makeRoom(A, { gameMode: 'TEAM', totalRounds: 1, roundTime: 60 });
  for (const p of [B, C, D]) await L.join(p, code);
  await L.sleep(300);
  const teams = ps.map((p) => (L.last(A).players.find((x) => x.username === p.name) || {}).team).join(',');
  L.check('setup: teams Red, Blue, Red, Blue', teams === 'Red,Blue,Red,Blue', teams);
  [B, C, D].forEach((p) => p.s.emit('toggle_ready')); await L.sleep(300);
  A.s.emit('start_game');

  // Turn 1: A (Red) draws → Blue (B, D) guesses, C (Red teammate) cannot
  await L.waitFor(() => L.last(A).status === 'PLAYING' && L.ORACLE[code], 15000);
  const w1 = L.ORACLE[code];
  L.check('turn 1: A (Red) is the drawer', L.last(A).currentDrawer === A.name, L.last(A).currentDrawer);

  const mark = ps.map((p) => p.chats.length);
  const cCorrect = C.events.length;
  C.s.emit('send_chat', { text: w1 }); await L.sleep(500);
  L.check('teammate C guessing the word gets no correct_guess', !C.events.slice(cCorrect).some((e) => e.ev === 'correct_guess'));
  L.check('teammate C is told only the other team can guess', C.chats.slice(mark[2]).some((m) => m.isSystem && /other team can guess/.test(m.text)));
  L.check("teammate C's guess is not broadcast (nobody else sees the word)", ![A, B, D].some((p) => saw(p, w1, mark[ps.indexOf(p)])));
  L.check('teammate C scores nothing; nobody counted correct; Red score 0', scoreOf(A, C.name) === 0 && L.last(A).correctGuessersCount === 0 && team(A).Red.score === 0);

  B.s.emit('send_chat', { text: w1 });
  await L.waitFor(() => L.last(A).correctGuessersCount === 1, 3000);
  const bPts = scoreOf(A, B.name);
  L.check('opposing guesser B scores and adds to Blue', bPts > 0 && team(A).Blue.score === bPts && team(A).Red.score === 0, `B=${bPts} teams=${JSON.stringify(team(A))}`);
  L.check('one of two opposing guessers correct → round continues', L.last(A).status === 'PLAYING');

  const before = Date.now();
  const roundEnd = new Promise((r) => A.s.once('round_end', r));
  D.s.emit('send_chat', { text: w1 });
  const end = await Promise.race([roundEnd, L.sleep(3000).then(() => null)]);
  L.check('all opposing guessers correct → round ends at once (C not waited for)', end && Date.now() - before < 3000 && L.last(A).status !== 'PLAYING', end ? `${Date.now() - before} ms` : 'no round_end');
  const expDrawer = calculateDrawerScore(2, 2);
  L.check('drawer points use the opposing team size (2/2 guessers)', end && end.drawerPoints === expDrawer, `${end && end.drawerPoints} vs ${expDrawer}`);
  await L.sleep(300);
  L.check('drawer points go to Red; Blue keeps its guess points', team(A).Red.score === expDrawer && scoreOf(A, A.name) === expDrawer && team(A).Blue.score === scoreOf(A, B.name) + scoreOf(A, D.name), JSON.stringify(team(A)));

  // Turn 2: B (Blue) draws → Red (A, C) guesses, D (Blue teammate) cannot
  await L.waitFor(() => L.last(A).status === 'PLAYING' && L.last(A).currentDrawer === B.name, 15000);
  const w2 = L.ORACLE[code];
  L.check('turn 2: B (Blue) is the drawer', L.last(A).currentDrawer === B.name, L.last(A).currentDrawer);
  const dScore = scoreOf(A, D.name);
  D.s.emit('send_chat', { text: w2 }); await L.sleep(500);
  L.check('turn 2: Blue teammate D cannot guess', scoreOf(A, D.name) === dScore && L.last(A).correctGuessersCount === 0);
  A.s.emit('send_chat', { text: w2 });
  await L.waitFor(() => L.last(A).correctGuessersCount === 1, 3000);
  L.check('turn 2: former drawer A (now opposing team) can guess', L.last(A).correctGuessersCount === 1 && L.last(A).status === 'PLAYING');
  C.s.emit('send_chat', { text: w2 });
  L.check('turn 2: both Red guessers correct → round ends', await L.waitFor(() => L.last(A).status === 'ROUND_OVER', 3000), L.last(A).status);

  L.closeAll(...ps);
  L.finish();
})();
