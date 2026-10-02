// A8/A9 Solo AI: real DoodleNet model (in-process) + real server flow on TEST_PORT.
const fs = require('fs');
const path = require('path');
const L = require('../lib/e2e-lib');
const ROOT = path.join(__dirname, '..', '..');
const { SOLO_AI, WORD_DIFFICULTY } = require(path.join(ROOT, 'shared', 'contract.js'));
const db = require(path.join(ROOT, 'server', 'src', 'config', 'database.js'));
const { blank, doodles, noise } = require('../fixtures/doodles');
const RESULT_KEYS = ['confidence', 'guess', 'isConfident', 'isCorrect', 'modelSees', 'ready', 'targetWord', 'top3'];
const keysOf = (o) => Object.keys(o).sort().join(',');

(async () => {
  // ---------- Part 1: predictor module with the real model ----------
  const src = fs.readFileSync(path.join(ROOT, 'server', 'src', 'utils', 'aiPredictor.js'), 'utf8');
  L.check('A8 aiPredictor has no Math.random and no heuristicFallback', !/Math\.random|heuristicFallback/.test(src));
  const ai = require(path.join(ROOT, 'server', 'src', 'utils', 'aiPredictor.js'));
  await L.waitFor(() => ai.isLoaded, 30000);
  L.check('A8 real DoodleNet model loaded (345 classes, 19 game words)', ai.isLoaded && ai.classNames.length === 345 && ai.gameWordMappings.length === Object.keys(SOLO_AI.GAME_WORDS).length);

  ai.isLoaded = false;
  const notReady = await Promise.all(Array.from({ length: 20 }, () => ai.predictUserDrawing('Sun', doodles.Sun())));
  ai.isLoaded = true;
  L.check('A8 model not ready → ready:false, isCorrect:false, no guess (20 identical calls, no randomness)',
    notReady.every((r) => r.ready === false && r.isCorrect === false && r.guess === null && JSON.stringify(r) === JSON.stringify(notReady[0])));
  const empty = await ai.predictUserDrawing('Sun', blank());
  L.check('A8 empty canvas → ready, no guess, not correct', empty.ready && empty.guess === null && !empty.isCorrect);
  L.check('A8 result fields match the contract', keysOf(empty) === RESULT_KEYS.join(','), keysOf(empty));

  const sun = await ai.predictUserDrawing('Sun', doodles.Sun());
  L.check('A8 synthetic Sun doodle recognised for target Sun', sun.isCorrect && sun.isConfident && sun.guess === 'Sun', JSON.stringify({ guess: sun.guess, c: sun.confidence, sees: sun.modelSees }));
  const sunWrong = await ai.predictUserDrawing('Clock', doodles.Sun());
  L.check('A8 the same Sun doodle does not score for target Clock', sunWrong.isCorrect === false);
  const clock = await ai.predictUserDrawing('Clock', doodles.Clock());
  L.check('A8 synthetic Clock doodle recognised for target Clock', clock.isCorrect === true, JSON.stringify({ guess: clock.guess, sees: clock.modelSees }));
  const house = await ai.predictUserDrawing('House', doodles.House());
  L.check('A9 low raw probability → isConfident:false and not correct (House doodle)', house.isConfident === false && house.isCorrect === false,
    JSON.stringify({ guess: house.guess, sees: house.modelSees }));
  const scribbles = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => ai.predictUserDrawing('Dragon', noise(seed))));
  L.check('A9 scribbles: never correct while not confident (12 deterministic scribbles)', scribbles.every((r) => r.isConfident || !r.isCorrect),
    `${scribbles.filter((r) => !r.isConfident).length}/12 not confident, ${scribbles.filter((r) => r.isCorrect).length} correct`);

  // ---------- Part 2: server flow ----------
  { // Solo turn starts PLAYING immediately with a server-chosen, AI-supported word of the chosen difficulty
    const A = L.player(L.nextName('S'), { autoSelect: false, autoGuess: false });
    await L.makeRoom(A, { gameMode: 'SOLO_AI', roundTime: 30 });
    A.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.HARD, totalRounds: 1 }); await L.sleep(300);
    const t0 = Date.now();
    A.s.emit('start_game');
    const playing = await L.waitFor(() => A.frames.some((f) => f.status === 'PLAYING'), 3000);
    const f = A.frames.find((x) => x.status === 'PLAYING');
    const hardAi = db.words.filter((w) => w.difficulty === WORD_DIFFICULTY.HARD && w.word in SOLO_AI.GAME_WORDS).map((w) => w.word);
    L.check('A8 Solo turn starts PLAYING without the word-selection wait', playing && Date.now() - t0 < 3000 && !A.events.some((e) => e.ev === 'word_selection'));
    L.check('A8 server chose an AI-supported HARD word and sent it to the solo drawer', f && hardAi.includes(f.currentWord), f && `${f.currentWord} ∈ [${hardAi}]`);
    const target = f.currentWord;
    const results = () => A.events.filter((e) => e.ev === 'solo_ai_prediction_result');

    A.s.emit('solo_ai_predict', { targetWord: 'Sun' === target ? 'Clock' : 'Sun', pixels: doodles.Sun() }); await L.sleep(700);
    L.check('A8 request with a word other than the server target is ignored', results().length === 0);
    A.s.emit('solo_ai_predict', { targetWord: target, pixels: [1, 2, 3] }); await L.sleep(700);
    L.check('A8 invalid payload (wrong pixel count) is ignored', results().length === 0);
    A.s.emit('solo_ai_predict', { pixels: doodles.House() }); await L.sleep(700);
    L.check('A8 request without targetWord is ignored', results().length === 0);
    A.s.emit('solo_ai_predict', { targetWord: target, pixels: doodles.House() });
    A.s.emit('solo_ai_predict', { targetWord: target, pixels: doodles.House() }); // within SERVER_MIN_INTERVAL_MS
    await L.sleep(900);
    L.check(`A8 rate limit: 2 requests inside ${SOLO_AI.SERVER_MIN_INTERVAL_MS} ms → 1 result`, results().length === 1, String(results().length));
    const r = results()[0] && results()[0].data;
    L.check('A8 server result echoes the server target and has the contract fields', r && r.targetWord === target && keysOf(r) === RESULT_KEYS.join(','), r && keysOf(r));
    L.closeAll(A);
  }
  // Only doodles the real model is shown above to recognise (House is the deliberate not-confident example)
  const RECOGNISED = ['Sun', 'Clock'];
  { // Correct drawing scores SOLO_AI.CORRECT_SCORE and ends the turn (EASY pool contains Sun and Clock; try up to 10 turns)
    const A = L.player(L.nextName('S'), { autoSelect: false, autoGuess: false });
    await L.makeRoom(A, { gameMode: 'SOLO_AI', roundTime: 3 });
    A.s.emit('update_room_settings', { wordDifficulty: WORD_DIFFICULTY.EASY, totalRounds: 10 }); await L.sleep(300);
    A.s.emit('start_game');
    let scored = null; const seen = [];
    for (let turn = 0; turn < 10 && !scored; turn++) {
      await L.waitFor(() => L.last(A) && L.last(A).status === 'PLAYING' && !seen.includes(L.last(A).currentRound + ':' + L.last(A).currentWord), 12000);
      const cur = L.last(A); seen.push(cur.currentRound + ':' + cur.currentWord);
      if (RECOGNISED.includes(cur.currentWord)) {
        await L.sleep(SOLO_AI.SERVER_MIN_INTERVAL_MS);
        A.s.emit('solo_ai_predict', { targetWord: cur.currentWord, pixels: doodles[cur.currentWord]() });
        await L.waitFor(() => A.events.some((e) => e.ev === 'round_end' && /AI guessed correctly/.test(e.data.reason)), 3000);
        await L.sleep(200);
        scored = { word: cur.currentWord, score: L.last(A).players[0].score, end: A.events.find((e) => e.ev === 'round_end' && /AI guessed correctly/.test(e.data.reason)) };
      }
    }
    if (scored) {
      L.check(`A8 correct ${scored.word} doodle ends the turn ("AI guessed correctly")`, !!scored.end);
      L.check(`A8 solo player gets SOLO_AI.CORRECT_SCORE (${SOLO_AI.CORRECT_SCORE})`, scored.score === SOLO_AI.CORRECT_SCORE, String(scored.score));
    } else {
      console.log(`INFO  correct-drawing path not exercised: target was never Sun/Clock in ${seen.length} turns (${seen.join(' ')})`);
    }
    L.closeAll(A);
  }
  { // predictions are ignored outside Solo AI rooms
    const A = L.player(L.nextName('H'), { autoGuess: false }), B = L.player(L.nextName('G'), { autoGuess: false });
    const { code } = await L.makeRoom(A); await L.join(B, code); B.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game'); await L.waitFor(() => L.last(A).status === 'PLAYING', 12000);
    A.s.emit('solo_ai_predict', { targetWord: 'Sun', pixels: doodles.Sun() }); await L.sleep(700);
    L.check('A8 solo_ai_predict ignored in a multiplayer room', !A.events.some((e) => e.ev === 'solo_ai_prediction_result'));
    L.closeAll(A, B);
  }
  L.finish();
})();
