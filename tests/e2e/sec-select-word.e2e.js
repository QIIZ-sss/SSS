// Security: select_word accepts only a word offered to the drawer this turn (room.wordOptions).
// Forged / arbitrary / malformed selections are ignored and do not end or start anything; the turn goes on.
const path = require('path');
const L = require('../lib/e2e-lib');
const db = require(path.join(__dirname, '..', '..', 'server', 'src', 'config', 'database.js')); // the server's word bank
const { WORD_DIFFICULTY } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const hard = db.words.filter((w) => w.difficulty === WORD_DIFFICULTY.HARD).map((w) => w.word);
const since = (p, t0) => p.events.filter((e) => e.t >= t0);
const status = (p) => L.last(p).status;

(async () => {
  { // forged selections during WORD_SELECTION
    const A = L.player(L.nextName('H'), { autoSelect: false }), B = L.player(L.nextName('G'));
    const { code } = await L.makeRoom(A); await L.join(B, code);
    A.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.HARD }); B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => A.words && status(A) === 'WORD_SELECTION', 5000);
    const offered = A.words, notOffered = hard.find((w) => !offered.includes(w));
    const t0 = Date.now();
    const tries = [
      ['an arbitrary word', { word: 'HackedWord' }],
      [`a real bank word that was not offered (${notOffered})`, { word: notOffered }],
      ['a different case of an offered word', { word: offered[0].toUpperCase() }],
      ['a non-string word', { word: 42 }],
      ['an array word', { word: [offered[0]] }],
      ['no payload', undefined],
    ];
    for (const [label, payload] of tries) {
      if (payload === undefined) A.s.emit('select_word'); else A.s.emit('select_word', payload);
      await L.sleep(300);
      L.check(`select_word with ${label} is ignored (still WORD_SELECTION, no round_start)`,
        status(A) === 'WORD_SELECTION' && !since(A, t0).some((e) => e.ev === 'round_start'));
    }
    B.s.emit('select_word', { word: offered[0] }); await L.sleep(300);
    L.check('a non-drawer cannot select even an offered word', status(A) === 'WORD_SELECTION' && !since(A, t0).some((e) => e.ev === 'round_start'));
    L.check('the forged words never became the drawer\'s current word', since(A, t0).every((e) => e.ev !== 'room_data' || !e.data.currentWord));
    L.ORACLE[code] = offered[1]; // the guest guesses this word
    A.s.emit('select_word', { word: offered[1] });
    await L.waitFor(() => status(A) === 'PLAYING', 3000);
    L.check('the drawer can still pick an offered word afterwards → PLAYING with that word', status(A) === 'PLAYING' && L.last(A).currentWord === offered[1],
      `${status(A)} ${L.last(A).currentWord}`);
    await L.waitFor(() => since(A, t0).some((e) => e.ev === 'round_end'), 10000);
    const end = since(A, t0).find((e) => e.ev === 'round_end');
    L.check('round_end reveals the selected offered word', end && end.data.word === offered[1], end && end.data.word);
    L.closeAll(A, B);
  }
  { // forged selection, then no valid pick: the selection timer still auto-picks an offered word
    const A = L.player(L.nextName('H'), { autoSelect: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code);
    B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => A.words && status(A) === 'WORD_SELECTION', 5000);
    const offered = A.words;
    A.s.emit('select_word', { word: 'HackedWord' });
    const ok = await L.waitFor(() => status(A) === 'PLAYING', 13000);
    L.check('after a forged selection the 10 s selection timer still auto-picks the first offered word', ok && L.last(A).currentWord === offered[0],
      `${status(A)} ${L.last(A).currentWord} (offered ${offered.join('/')})`);
    L.closeAll(A, B);
  }
  { // W1 tracking is not affected: forged (not offered) bank words are not recorded as used
    const A = L.player(L.nextName('H'), { autoSelect: false }), B = L.player(L.nextName('G'), { autoSelect: false });
    const { code } = await L.makeRoom(A); await L.join(B, code);
    A.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.HARD, totalRounds: 3 }); B.s.emit('toggle_ready'); await L.sleep(300);
    // both players forge a not-offered HARD word first, then pick the first offered word
    for (const p of [A, B]) {
      p.s.on('word_selection', ({ words }) => {
        const forged = hard.find((w) => !words.includes(w));
        p.s.emit('select_word', { word: forged });
        setTimeout(() => { L.ORACLE[code] = words[0]; p.s.emit('select_word', { word: words[0] }); }, 150);
      });
    }
    const t0 = Date.now();
    A.s.emit('start_game');
    await L.waitFor(() => since(A, t0).some((e) => e.ev === 'game_over'), 150000);
    const offers = [A, B].flatMap((p) => since(p, t0).filter((e) => e.ev === 'word_selection')).sort((a, b) => a.t - b.t).map((e) => e.data.words);
    const targets = since(A, t0).filter((e) => e.ev === 'round_end').map((e) => e.data.word);
    // turn i: the words not yet drawn must come first (all of them when fewer than 3 remain)
    const bad = offers.slice(0, hard.length).map((words, i) => {
      const unused = hard.filter((w) => !targets.slice(0, i).includes(w));
      const k = Math.min(3, unused.length);
      const head = words.slice(0, k);
      return head.every((w) => unused.includes(w)) && (unused.length > 3 || unused.every((w) => head.includes(w))) ? null : `turn ${i + 1}: ${words.join('/')}`;
    }).filter(Boolean);
    L.check('forged words are not counted as used: first 5 targets distinct and the undrawn words always offered first',
      targets.length === 6 && new Set(targets.slice(0, 5)).size === 5 && bad.length === 0, bad.join('; ') || targets.join(','));
    L.closeAll(A, B);
  }
  L.finish();
})();
