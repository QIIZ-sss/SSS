// D1 word difficulty: host setting, validation, and words drawn only from the chosen difficulty.
const path = require('path');
const L = require('../lib/e2e-lib');
const db = require(path.join(__dirname, '..', '..', 'server', 'src', 'config', 'database.js')); // the server's word bank (source of truth)
const { WORD_DIFFICULTY } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const bank = (d) => db.words.filter((w) => w.difficulty === d).map((w) => w.word);
const offered = (...ps) => ps.flatMap((p) => p.events.filter((e) => e.ev === 'word_selection').flatMap((e) => e.data.words));

(async () => {
  { // settings: default Mixed, host can set, guest cannot, invalid ignored, Mixed again
    const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code); await L.sleep(300);
    L.check('D1 default difficulty is Mixed (null) in room_data', L.last(B).wordDifficulty === null);
    A.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.EASY }); await L.sleep(300);
    L.check('D1 host sets EASY → every client sees it', L.last(B).wordDifficulty === 'EASY');
    B.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.HARD }); await L.sleep(300);
    L.check('D1 non-host cannot change difficulty', L.last(A).wordDifficulty === 'EASY');
    A.s.emit('update_room_settings', { wordDifficulty: 'SUPER_HARD' }); await L.sleep(300);
    L.check('D1 invalid value ignored', L.last(A).wordDifficulty === 'EASY');
    A.s.emit('update_room_settings', { wordDifficulty: null }); await L.sleep(300);
    L.check('D1 host can switch back to Mixed', L.last(B).wordDifficulty === null);
    L.closeAll(A, B);
  }
  for (const level of [WORD_DIFFICULTY.EASY, WORD_DIFFICULTY.MEDIUM, WORD_DIFFICULTY.HARD]) {
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code);
    A.s.emit('update_room_settings', { wordDifficulty: level, totalRounds: 3 }); B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => A.frames.some((f) => f.status === 'GAME_OVER'), 90000);
    const words = offered(A, B), allowed = bank(level);
    L.check(`D1 ${level}: all offered words come from the ${level} list (6 turns × 3 words)`, words.length === 18 && words.every((w) => allowed.includes(w)),
      `${words.length} offered; outside: ${words.filter((w) => !allowed.includes(w)).join(',') || 'none'}`);
    L.check(`D1 ${level}: difficulty kept after the game returns to LOBBY`, await L.waitFor(() => L.last(A).status === 'LOBBY', 15000) && L.last(A).wordDifficulty === level);
    L.closeAll(A, B);
  }
  { // MIXED (null): offered words may come from several levels
    const A = L.player(L.nextName('H')), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code);
    A.s.emit('update_room_settings', { wordDifficulty: null, totalRounds: 3 }); B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => A.frames.some((f) => f.status === 'GAME_OVER'), 90000);
    const words = offered(A, B);
    const levels = [...new Set(words.map((w) => (db.words.find((x) => x.word === w) || {}).difficulty))];
    L.check('D1 MIXED: offered words span more than one difficulty level', words.length === 18 && levels.length >= 2, `levels: ${levels.join(', ')}`);
    L.closeAll(A, B);
  }
  { // fallback: a difficulty with fewer than 3 words falls back to Mixed (checked on this process's copy of the bank)
    const saved = db.words;
    const counts = Object.values(WORD_DIFFICULTY).map((d) => `${d}=${bank(d).length}`).join(' ');
    L.check('D1 every difficulty has at least 3 words in the current bank (no fallback needed today)', Object.values(WORD_DIFFICULTY).every((d) => bank(d).length >= 3), counts);
    db.words = saved.filter((w) => w.difficulty !== WORD_DIFFICULTY.HARD).concat(saved.filter((w) => w.difficulty === WORD_DIFFICULTY.HARD).slice(0, 2));
    const picked = db.getRandomWords(3, { difficulty: WORD_DIFFICULTY.HARD });
    L.check('D1 small pool (2 HARD words) falls back to Mixed and still returns 3 words', picked.length === 3, picked.map((w) => w.word).join(','));
    db.words = saved;
  }
  L.finish();
})();
