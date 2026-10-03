// T1-05 word bank: 60–90 words, grouped by difficulty, original 20 kept, added words are DoodleNet classes;
// D1 difficulty filter, A8 Solo AI word list and W1 no-repeat still work on the larger bank.
// Deterministic: the server's bank and the real RoundManager in-process (no server needed).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const db = require(path.join(ROOT, 'server/src/config/database.js'));
const roomManager = require(path.join(ROOT, 'server/src/gameLogic/RoomManager.js'));
const TimerManager = require(path.join(ROOT, 'server/src/gameLogic/TimerManager.js'));
const RoundManager = require(path.join(ROOT, 'server/src/gameLogic/RoundManager.js'));
const { WORD_DIFFICULTY, SOLO_AI } = require(path.join(ROOT, 'shared/contract.js'));
const { normalizeGuess } = require(path.join(ROOT, 'shared/utils.js'));

const results = [];
const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const LEVELS = Object.values(WORD_DIFFICULTY);
const words = db.words;
const bank = (d) => words.filter((w) => w.difficulty === d).map((w) => w.word);
const isAi = (w) => Object.prototype.hasOwnProperty.call(SOLO_AI.GAME_WORDS, w);
const distinct = (a) => new Set(a).size === a.length;

// ---------- the bank itself ----------
const counts = LEVELS.map((d) => `${d}=${bank(d).length}`).join(' ');
check('bank has 60–90 words', words.length >= 60 && words.length <= 90, `${words.length} words (${counts})`);
check('every difficulty has at least 20 words', LEVELS.every((d) => bank(d).length >= 20), counts);
check('every entry: known difficulty, category, unique id',
  words.every((w) => LEVELS.includes(w.difficulty) && typeof w.category === 'string' && w.category) && distinct(words.map((w) => w.id)));
const norm = words.map((w) => normalizeGuess(w.word));
check('no duplicate words (after guess normalisation)', distinct(norm), norm.filter((n, i) => norm.indexOf(n) !== i).join(','));
check('every word is guessable as written (letters and single spaces only)', words.every((w) => normalizeGuess(w.word) === w.word.toLowerCase()),
  words.filter((w) => normalizeGuess(w.word) !== w.word.toLowerCase()).map((w) => w.word).join(','));

const ORIGINAL = [ // the bank before T1-05: id, word, difficulty — must stay unchanged
  ['1', 'Apple', 'EASY'], ['2', 'Cat', 'EASY'], ['3', 'House', 'EASY'], ['4', 'Car', 'EASY'], ['5', 'Tree', 'EASY'],
  ['6', 'Sun', 'EASY'], ['7', 'Pizza', 'MEDIUM'], ['8', 'Airplane', 'MEDIUM'], ['9', 'Elephant', 'MEDIUM'],
  ['10', 'Bicycle', 'MEDIUM'], ['11', 'Guitar', 'MEDIUM'], ['12', 'Computer', 'HARD'], ['13', 'Eiffel Tower', 'HARD'],
  ['14', 'Astronaut', 'HARD'], ['15', 'Helicopter', 'HARD'], ['16', 'Submarine', 'HARD'], ['17', 'Dragon', 'MEDIUM'],
  ['18', 'Rainbow', 'EASY'], ['19', 'Clock', 'EASY'], ['20', 'Basketball', 'EASY'],
];
const missing = ORIGINAL.filter(([id, w, d]) => !words.some((x) => x.id === id && x.word === w && x.difficulty === d));
check('the 20 original words are kept with the same id and difficulty', missing.length === 0, missing.map((m) => m[1]).join(',') || '20/20');

const classes = new Set(fs.readFileSync(path.join(ROOT, 'server/src/ai_model/class_names.txt'), 'utf8').split('\n').map((s) => s.trim().toLowerCase()));
const toClass = (w) => w.toLowerCase().replace(/ /g, '_');
const added = words.filter((w) => !ORIGINAL.some(([id]) => id === w.id));
const notClass = added.filter((w) => !classes.has(toClass(w.word)) && !classes.has(`the_${toClass(w.word)}`));
check(`every added word (${added.length}) is a DoodleNet class`, added.length > 0 && notClass.length === 0, notClass.map((w) => w.word).join(','));

// ---------- A8: Solo AI words ----------
check('A8 every Solo AI word (SOLO_AI.GAME_WORDS) is in the bank', Object.keys(SOLO_AI.GAME_WORDS).every((w) => words.some((x) => x.word === w)));
const aiCounts = LEVELS.map((d) => `${d}=${bank(d).filter(isAi).length}`).join(' ');
check('A8 every difficulty has at least 3 Solo AI words (no Mixed fallback in Solo)', LEVELS.every((d) => bank(d).filter(isAi).length >= 3), aiCounts);

// ---------- D1: difficulty filter on the larger bank ----------
for (const d of LEVELS) {
  const seen = new Set(); let bad = 0, aiBad = 0;
  for (let i = 0; i < 400; i++) {
    const pick = db.getRandomWords(3, { difficulty: d }).map((w) => w.word);
    if (pick.length !== 3 || !distinct(pick) || !pick.every((w) => bank(d).includes(w))) bad++;
    pick.forEach((w) => seen.add(w));
    const ai = db.getRandomWords(3, { difficulty: d, aiOnly: true }).map((w) => w.word);
    if (ai.length !== 3 || !distinct(ai) || !ai.every((w) => bank(d).includes(w) && isAi(w))) aiBad++;
  }
  check(`D1 ${d}: 3 distinct ${d} words every time, every ${d} word reachable`, bad === 0 && seen.size === bank(d).length, `${bad} bad picks, ${seen.size}/${bank(d).length} seen`);
  check(`A8 ${d} Solo: 3 distinct Solo AI ${d} words every time`, aiBad === 0, `${aiBad} bad picks`);
}

// ---------- W1 on the full bank: the real RoundManager, one turn after another ----------
const io = { to: () => ({ emit: () => {} }), emit: () => {}, sockets: { sockets: new Map() } };
const tm = new TimerManager(io);
const rnd = new RoundManager(roomManager, tm);
function newRoom(level, mode = 'MULTIPLAYER_FFA') {
  const room = roomManager.createRoom(null, 'T', 'A', mode, { totalRounds: 1000 });
  const names = mode === 'SOLO_AI' ? ['A'] : ['A', 'B'];
  names.forEach((u) => room.players.push({ socketId: null, username: u, avatar: '🐶', score: 0, isReady: true }));
  room.wordDifficulty = level; room.status = 'ROUND_OVER'; room.currentRound = 1;
  return room;
}
function playTurns(room, n) { // drawer (or Solo AI) takes the first offered word, as the timeout auto-pick does
  const offers = [], targets = [];
  for (let i = 0; i < n; i++) {
    rnd.startTurnSelection(io, room);
    offers.push([...room.wordOptions]);
    if (room.status === 'WORD_SELECTION') { room.currentWord = room.wordOptions[0]; rnd.startRoundDrawing(io, room); }
    targets.push(room.currentWord);
    tm.stopTimer(room.id); tm.clearTransition(room.id);
    room.status = 'ROUND_OVER'; room.drawerIndex++;
  }
  return { offers, targets };
}
for (const d of LEVELS) {
  const pool = bank(d), room = newRoom(d);
  const { offers, targets } = playTurns(room, pool.length + 1);
  const unusedFirst = offers.slice(0, pool.length).every((o, i) => {
    const unused = pool.filter((w) => !targets.slice(0, i).includes(w));
    const k = Math.min(3, unused.length);
    return o.slice(0, k).every((w) => unused.includes(w)) && (unused.length > 3 || unused.every((w) => o.includes(w)));
  });
  check(`W1 ${d} (${pool.length} words): ${pool.length} turns → ${pool.length} distinct targets, then reuse; always 3 distinct ${d} choices, unused first`,
    distinct(targets.slice(0, pool.length)) && targets.slice(0, pool.length).includes(targets[pool.length]) && unusedFirst
      && offers.every((o) => o.length === 3 && distinct(o) && o.every((w) => pool.includes(w))),
    `targets ${targets.length}, distinct before reuse ${new Set(targets.slice(0, pool.length)).size}`);
  roomManager.removeRoom(room.id);
}
{ // LOBBY resets tracking: 24 of 25 EASY words used, back to LOBBY → the new match again has 25 distinct targets
  // (with the old list carried over, turn 1 would take the one leftover word and the list would reset right after)
  const pool = bank(WORD_DIFFICULTY.EASY), room = newRoom(WORD_DIFFICULTY.EASY);
  playTurns(room, pool.length - 1);
  rnd.returnToLobby(io, room); tm.clearTransition(room.id);
  const reset = room.usedWords.length === 0 && room.wordDifficulty === WORD_DIFFICULTY.EASY;
  room.status = 'ROUND_OVER'; room.currentRound = 1;
  const { targets } = playTurns(room, pool.length);
  check('W1 back in LOBBY: tracking reset, difficulty kept, new match has 25 distinct EASY targets',
    reset && distinct(targets) && targets.every((w) => pool.includes(w)), `reset ${reset}, ${new Set(targets).size} distinct`);
  roomManager.removeRoom(room.id);
}
{
  const aiHard = bank(WORD_DIFFICULTY.HARD).filter(isAi), room = newRoom(WORD_DIFFICULTY.HARD, 'SOLO_AI');
  const { targets } = playTurns(room, aiHard.length + 1);
  check(`W1 + A8 Solo HARD: ${aiHard.length} distinct Solo AI targets, then reuse`,
    targets.every((w) => aiHard.includes(w)) && distinct(targets.slice(0, aiHard.length)) && targets.slice(0, aiHard.length).includes(targets[aiHard.length]),
    targets.join(','));
  roomManager.removeRoom(room.id);
}

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
