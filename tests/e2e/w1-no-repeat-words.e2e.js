// W1 no repeated target words within a match: unused words first, always 3 choices (top-up with used words of the
// same pool), per-room tracking, reset on exhaustion and on LOBBY / new match.
// T1-05: the bank has 25 words per difficulty, so a short live match no longer exhausts a pool; exhaustion, top-up
// and the LOBBY reset on the full bank are checked in-process in t1-05-word-bank.e2e.js.
const path = require('path');
const L = require('../lib/e2e-lib');
const db = require(path.join(__dirname, '..', '..', 'server', 'src', 'config', 'database.js')); // the server's word bank (source of truth)
const { WORD_DIFFICULTY, SOLO_AI } = require(path.join(__dirname, '..', '..', 'shared', 'contract.js'));
const { EASY, HARD } = WORD_DIFFICULTY;
const bank = (d) => db.words.filter((w) => w.difficulty === d).map((w) => w.word);
// word lists offered per turn (only the drawer receives word_selection) and target words per turn (round_end), in order
const since = (p, t0) => p.events.filter((e) => e.t >= t0);
const offers = (t0, ...ps) => ps.flatMap((p) => since(p, t0).filter((e) => e.ev === 'word_selection')).sort((a, b) => a.t - b.t).map((e) => e.data.words);
const targets = (p, t0) => since(p, t0).filter((e) => e.ev === 'round_end').map((e) => e.data.word);
const distinct = (a) => new Set(a).size === a.length;
const sameSet = (a, b) => a.length === b.length && a.every((w) => b.includes(w));
// Turn i (0-based) of a match on a pool of n words, with targets t: the words still unused must come first in the offer
// (all of them when fewer than 3 remain). Returns the turns that break this.
const unusedFirstViolations = (o, t, pool) => o.map((words, i) => {
  if (i >= pool.length) return null; // after exhaustion the list starts over
  const unused = pool.filter((w) => !t.slice(0, i).includes(w));
  const k = Math.min(3, unused.length);
  return words.slice(0, k).every((w) => unused.includes(w)) && (unused.length > 3 || sameSet(words.slice(0, k), unused)) ? null : `turn ${i + 1}: ${words.join('/')}`;
}).filter(Boolean);

async function setupRoom(level, rounds, extra = {}) {
  const A = L.player(L.nextName('H')), B = extra.gameMode ? null : L.player(L.nextName('G'));
  const { code } = await L.makeRoom(A, extra); if (B) await L.join(B, code);
  A.s.emit('update_room_settings', { wordDifficulty: level, totalRounds: rounds }); await L.sleep(200);
  return { A, B, code, ps: B ? [A, B] : [A] };
}
async function playMatch(room, rounds, ms = 120000) {
  const { A, B } = room;
  if (rounds) { A.s.emit('update_room_settings', { totalRounds: rounds }); await L.sleep(200); }
  room.ps.forEach((p) => p.guessedTurns.clear()); // guess keys are room:round:drawer and repeat in a second match
  if (B) { B.s.emit('toggle_ready'); await L.sleep(300); }
  const t0 = Date.now();
  A.s.emit('start_game');
  await L.waitFor(() => since(A, t0).some((e) => e.ev === 'game_over'), ms);
  return t0;
}

(async () => {
  const hard = bank(HARD), easy = bank(EASY);
  L.check('W1 setup: HARD pool has more than 6 words (a 6-turn match never exhausts it)', hard.length > 6, `${hard.length} HARD words`);

  { // in-process: difficulty filter first, then excluded words removed (no Mixed fallback because the HARD pool itself has ≥ 3)
    const picked = db.getRandomWords(3, { difficulty: HARD, exclude: hard.slice(2) }).map((w) => w.word);
    L.check('W1 exclude applies after the difficulty filter (2 unused HARD words left → only those 2)',
      picked.length === 2 && picked.every((w) => hard.slice(0, 2).includes(w)), picked.join(','));
    L.check('W1 every word excluded → nothing returned (caller resets)', db.getRandomWords(3, { difficulty: HARD, exclude: hard }).length === 0);
  }

  { // 1, 2: HARD match, 6 turns
    const room = await setupRoom(HARD, 3);
    const t0 = await playMatch(room);
    const o = offers(t0, ...room.ps), t = targets(room.A, t0);
    L.check('W1 HARD match: 6 turns played', o.length === 6 && t.length === 6, `offers ${o.length}, targets ${t.length}`);
    L.check('W1 always 3 distinct choices per turn', o.every((w) => w.length === 3 && distinct(w)), o.map((w) => w.join('/')).join(' | '));
    L.check('W1 difficulty: every offered and target word is HARD', o.flat().every((w) => hard.includes(w)) && t.every((w) => hard.includes(w)),
      `outside: ${o.flat().concat(t).filter((w) => !hard.includes(w)).join(',') || 'none'}`);
    L.check('W1 no repeated target in the match (6 distinct targets)', distinct(t), t.join(','));
    const bad = unusedFirstViolations(o, t, hard);
    L.check('W1 unused words come first (no offered word was already drawn)', bad.length === 0, bad.join('; ') || o.map((w) => w.join('/')).join(' | '));
    L.closeAll(...room.ps);
  }

  { // 4: two HARD rooms played at the same time keep separate lists
    const R1 = await setupRoom(HARD, 2), R2 = await setupRoom(HARD, 2);
    const [t1, t2] = await Promise.all([playMatch(R1), playMatch(R2)]);
    for (const [n, R, t0] of [[1, R1, t1], [2, R2, t2]]) {
      const o = offers(t0, ...R.ps), t = targets(R.A, t0), bad = unusedFirstViolations(o, t, hard);
      L.check(`W1 rooms do not share tracking: room ${n} — 4 distinct targets, its own unused words first every turn`,
        o.length === 4 && t.length === 4 && distinct(t) && bad.length === 0, bad.join('; ') || `${t.join(',')} — ${o.map((w) => w.join('/')).join(' | ')}`);
    }
    L.closeAll(...R1.ps, ...R2.ps);
  }

  { // 3: LOBBY / new match (EASY): difficulty kept, no repeats in the new match (reset itself: t1-05-word-bank)
    const room = await setupRoom(EASY, 3);
    const t1 = await playMatch(room);
    const t = targets(room.A, t1);
    const back = await L.waitFor(() => L.last(room.A).status === 'LOBBY', 15000);
    const t2 = await playMatch(room, 2);
    const tg2 = targets(room.A, t2);
    L.check('W1 EASY match 1: 6 distinct targets, then back in LOBBY', back && t.length === 6 && distinct(t), t.join(','));
    L.check('W1 new match: 4 distinct EASY targets (difficulty kept)', tg2.length === 4 && distinct(tg2) && tg2.every((w) => easy.includes(w)), tg2.join(','));
    L.closeAll(...room.ps);
  }

  { // Solo AI + HARD: 4 model-supported HARD words. T1-23: each round is a HUMAN turn (server word from this pool) then an
    // AI-draw turn (template words, own list) → only the human turns (1st, 3rd, … round_end) are checked here.
    const aiHard = hard.filter((w) => Object.prototype.hasOwnProperty.call(SOLO_AI.GAME_WORDS, w));
    const room = await setupRoom(HARD, 5, { gameMode: 'SOLO_AI', roundTime: 15 });
    room.A.s.emit('update_room_settings', { roundTime: 15 }); await L.sleep(200);
    const t0 = await playMatch(room, null, 260000);
    const all = targets(room.A, t0), t = all.filter((_, i) => i % 2 === 0), ai = all.filter((_, i) => i % 2 === 1);
    L.check(`W1 Solo AI HARD: 5 human turns, every human target a non-empty AI-supported HARD word [${aiHard.join(', ')}]`,
      all.length === 10 && t.length === 5 && t.every((w) => aiHard.includes(w)), all.join(','));
    L.check('W1 Solo AI HARD: no repeat before the 4-word pool is exhausted, reuse after', aiHard.length === 4 && distinct(t.slice(0, 4)) && t.slice(0, 4).includes(t[4]),
      t.join(','));
    L.check('T1-23: the 5 AI turns drew 5 different template words', ai.length === 5 && distinct(ai) && ai.every((w) => SOLO_AI.AI_DRAW_WORDS.includes(w)), ai.join(','));
    L.closeAll(...room.ps);
  }
  L.finish();
})();
