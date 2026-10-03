// T1-23 stage 1: Solo alternating turns. Part 1 drives the real game / chat / round code in-process with recording
// sockets and a stubbed DoodleNet result (deterministic scoring); part 2 plays a real Solo match on the server (TEST_PORT).
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const L = require('../lib/e2e-lib');
const check = L.check;
const roomManager = require(path.join(ROOT, 'server/src/gameLogic/RoomManager.js'));
const TimerManager = require(path.join(ROOT, 'server/src/gameLogic/TimerManager.js'));
const RoundManager = require(path.join(ROOT, 'server/src/gameLogic/RoundManager.js'));
const aiPredictor = require(path.join(ROOT, 'server/src/utils/aiPredictor.js'));
const aiDrawer = require(path.join(ROOT, 'server/src/utils/aiDrawer.js'));
const { setupGameHandlers } = require(path.join(ROOT, 'server/src/socket/gameHandler.js'));
const { setupChatHandlers, CLOSE_HINT } = require(path.join(ROOT, 'server/src/socket/chatHandler.js'));
const { SOLO_AI } = require(path.join(ROOT, 'shared/contract.js'));
const { calculateGuesserScore, calculateDrawerScore, normalizeGuess } = require(path.join(ROOT, 'shared/utils.js'));
const { HUMAN, AI } = SOLO_AI.TURNS;
const DRAW = ['draw_begin', 'draw_path', 'draw_end'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await sleep(25); } return !!fn(); };

async function inProcess() {
  // ---------- templates ----------
  check('exactly 7 AI-draw words, each with a template, all Solo (DoodleNet) words', SOLO_AI.AI_DRAW_WORDS.length === 7
    && JSON.stringify(Object.keys(aiDrawer.TEMPLATES).sort()) === JSON.stringify([...SOLO_AI.AI_DRAW_WORDS].sort())
    && SOLO_AI.AI_DRAW_WORDS.every((w) => w in SOLO_AI.GAME_WORDS), SOLO_AI.AI_DRAW_WORDS.join(', '));
  const det = SOLO_AI.AI_DRAW_WORDS.every((w) => JSON.stringify(aiDrawer.eventsFor(w)) === JSON.stringify(aiDrawer.eventsFor(w)));
  const pts = SOLO_AI.AI_DRAW_WORDS.flatMap((w) => aiDrawer.eventsFor(w)).filter((e) => e.data.x !== undefined);
  check('templates are deterministic, use only draw_begin / draw_path / draw_end, stay inside 640 × 480', det
    && SOLO_AI.AI_DRAW_WORDS.every((w) => aiDrawer.eventsFor(w).every((e) => DRAW.includes(e.ev)))
    && pts.every((e) => e.data.x >= 0 && e.data.x <= 640 && e.data.y >= 0 && e.data.y <= 480));
  check('every template finishes well inside the shortest round (15 s)', SOLO_AI.AI_DRAW_WORDS.every((w) => aiDrawer.eventsFor(w).length * SOLO_AI.AI_STROKE_INTERVAL_MS < 10000),
    SOLO_AI.AI_DRAW_WORDS.map((w) => `${w} ${(aiDrawer.eventsFor(w).length * SOLO_AI.AI_STROKE_INTERVAL_MS / 1000).toFixed(1)}s`).join(', '));

  // ---------- harness ----------
  const sockets = new Map();
  const io = {
    sockets: { sockets },
    to: (roomId) => ({ emit: (ev, data) => { const r = roomManager.getRoom(roomId); (r ? r.players : []).forEach((p) => { const s = sockets.get(p.socketId); if (s) s.inbox.push({ t: Date.now(), ev, data }); }); } }),
    emit: () => {},
  };
  const tm = new TimerManager(io);
  const rnd = new RoundManager(roomManager, tm);
  const S = { id: 'solo-sock', data: {}, inbox: [], handlers: {}, on(ev, fn) { this.handlers[ev] = fn; }, emit(ev, data, ...rest) { this.inbox.push({ t: Date.now(), ev, data }); }, join() {}, leave() {} };
  sockets.set(S.id, S); setupGameHandlers(io, S, tm, rnd); setupChatHandlers(io, S, tm, rnd);
  const ack = (ev, payload) => new Promise((r) => S.handlers[ev](payload, r));
  const res = await ack('create_room', { username: 'Ann', gameMode: 'SOLO_AI', roundTime: 15, totalRounds: 2 });
  const room = roomManager.getRoom(res.roomId);
  const frames = () => S.inbox.filter((e) => e.ev === 'room_data').map((e) => e.data);
  const last = () => frames()[frames().length - 1];
  const since = (t0, ev) => S.inbox.filter((e) => e.t >= t0 && (!ev || e.ev === ev));
  const realPredict = aiPredictor.predictUserDrawing;
  aiPredictor.predictUserDrawing = async (targetWord) => ({ targetWord, ready: true, guess: targetWord, confidence: 90, isConfident: true, top3: [], modelSees: null, isCorrect: true });
  try {
    S.handlers.start_game();
    // turn 1: human draws, AI guesses
    check('turn 1 (round 1): HUMAN — the human draws (currentDrawer = human), soloTurn HUMAN, aiScore 0',
      room.status === 'PLAYING' && room.soloTurn === HUMAN && room.currentDrawer === 'Ann' && last().soloTurn === HUMAN && last().aiScore === 0 && last().currentWord === room.currentWord);
    const remaining = tm.getRemainingTime(room.id);
    await new Promise((r) => { S.handlers.solo_ai_predict({ targetWord: room.currentWord, pixels: new Array(784).fill(0.5) }); setTimeout(r, 100); });
    const aiGuess = calculateGuesserScore(1, 1, remaining, room.roundTime), drawPts = calculateDrawerScore(1, 1);
    const ann = room.players[0];
    check(`AI recognises the human's drawing → AI gets FFA guesser points (${aiGuess}), human gets FFA drawer points (${drawPts})`,
      room.status === 'ROUND_OVER' && room.aiScore === aiGuess && ann.score === drawPts, `ai ${room.aiScore}, human ${ann.score}`);
    // turn 2: AI draws, human guesses
    await waitFor(() => room.status === 'PLAYING' && room.soloTurn === AI, 6000);
    const t2 = Date.now(), word = room.currentWord;
    check('turn 2 (round 1): AI — soloTurn AI, currentDrawer null, word is one of the 7 template words', room.soloTurn === AI && room.currentDrawer === null
      && room.currentRound === 1 && SOLO_AI.AI_DRAW_WORDS.includes(word), word);
    check('AI turn: the human gets no word (room_data currentWord empty, only wordLength), soloTurn AI', last().currentWord === '' && last().soloTurn === AI
      && last().wordLength === word.length);
    await sleep(1200);
    const n1 = since(t2).filter((e) => DRAW.includes(e.ev)).length;
    await sleep(800);
    const n2 = since(t2).filter((e) => DRAW.includes(e.ev)).length;
    check('AI draws progressively through draw_begin / draw_path / draw_end (more events over time, recorded in drawingHistory)', n1 > 5 && n2 > n1
      && room.drawingHistory.length >= n2 && since(t2, 'draw_begin').length >= 1, `${n1} → ${n2} events`);
    check('timer runs on the AI turn (timer_tick counting down)', since(t2, 'timer_tick').length >= 1 && since(t2, 'timer_tick').every((e) => e.data.timeRemaining <= 15));
    const close = normalizeGuess(word).slice(0, -1) + (normalizeGuess(word).endsWith('x') ? 'y' : 'x');
    const tc = Date.now();
    S.handlers.send_chat({ text: close });
    const hintOk = Array.from(word).length >= 4 ? since(tc, 'chat_message').some((e) => e.data.isSystem && e.data.text === CLOSE_HINT) : !since(tc, 'chat_message').some((e) => e.data.text === CLOSE_HINT);
    check(`T1-21 on the AI turn: a close guess gets "${CLOSE_HINT}" (word of ${word.length} letters; none for < 4)`, hintOk);
    const leak = S.inbox.filter((e) => e.t >= t2 && !(e.ev === 'round_end') && JSON.stringify(e.data).toLowerCase().includes(`"${word.toLowerCase()}"`));
    check('no event to the human carried the word during the AI turn', leak.length === 0, leak.map((e) => e.ev).join(','));
    const remaining2 = tm.getRemainingTime(room.id);
    const scoreBefore = ann.score, aiBefore = room.aiScore;
    S.handlers.send_chat({ text: word });
    const humanGuess = calculateGuesserScore(1, 1, remaining2, room.roundTime);
    check(`human guesses the AI's word → human gets FFA guesser points (~${humanGuess}), AI gets FFA drawer points (${drawPts})`,
      room.status === 'ROUND_OVER' && Math.abs(ann.score - scoreBefore - humanGuess) <= 15 && room.aiScore - aiBefore === drawPts, `human +${ann.score - scoreBefore}, ai +${room.aiScore - aiBefore}`);
    const t3 = Date.now(); await sleep(400);
    check('AI drawing stops when the turn ends', since(t3).filter((e) => DRAW.includes(e.ev)).length === 0);
    check('round_end reveals the word after the AI turn (allowed in ROUND_OVER)', S.inbox.some((e) => e.ev === 'round_end' && e.data.word === word) && last().currentWord === word);
    // turn 3: round 2, human again
    await waitFor(() => room.status === 'PLAYING' && room.currentRound === 2, 6000);
    check('turn 3: round 2 starts with the HUMAN turn again (HUMAN → AI → HUMAN)', room.soloTurn === HUMAN && room.currentDrawer === 'Ann');
    check('the AI-draw word is recorded for this match (aiDrawnWords) and in the W1 list', room.aiDrawnWords.includes(word) && room.usedWords.includes(word));
    // the AI never repeats a word before all 7 were drawn, even when the human's W1 pool resets in between
    const picks = [];
    for (let i = 0; i < 9; i++) { room.usedWords = []; rnd.startAiDrawTurn(io, room); picks.push(room.currentWord); tm.stopTimer(room.id); aiDrawer.stop(room.id); room.status = 'ROUND_OVER'; }
    const firstSeven = [word, ...picks].slice(0, 7);
    check('AI words: 7 different template words before any repeat (independent of the W1 reset)', new Set(firstSeven).size === 7 && firstSeven.every((w) => SOLO_AI.AI_DRAW_WORDS.includes(w)),
      [word, ...picks].join(','));
  } finally {
    aiPredictor.predictUserDrawing = realPredict;
    tm.stopTimer(room.id); tm.clearTransition(room.id); aiDrawer.stop(room.id); roomManager.removeRoom(room.id);
  }
}

async function live() {
  const A = L.player(L.nextName('S'), { autoSelect: false, autoGuess: false });
  await L.makeRoom(A, { gameMode: 'SOLO_AI', roundTime: 15 });
  A.s.emit('update_room_settings', { totalRounds: 1 }); await L.sleep(300);
  const t0 = Date.now();
  A.s.emit('start_game');
  await L.waitFor(() => L.last(A).status === 'PLAYING' && L.last(A).soloTurn === HUMAN, 5000);
  const human = L.last(A);
  check('live: Solo starts with the HUMAN turn (human sees the word, timer running)', human.currentDrawer === A.name && !!human.currentWord && human.soloTurn === HUMAN);
  // let the human turn time out (no drawing), then the AI turn
  await L.waitFor(() => L.last(A).status === 'PLAYING' && L.last(A).soloTurn === AI, 30000);
  const ta = Date.now();
  const aiFrame = L.last(A);
  check('live: then the AI turn — soloTurn AI, currentDrawer null, word hidden, same round', aiFrame.currentDrawer === null && aiFrame.currentWord === '' && aiFrame.currentRound === 1 && aiFrame.wordLength > 0);
  await L.sleep(2500);
  const drawn = A.events.filter((e) => e.t >= ta && DRAW.includes(e.ev));
  // which template is being drawn? compare the received prefix with each template
  const match = SOLO_AI.AI_DRAW_WORDS.find((w) => { const ev = aiDrawer.eventsFor(w); return drawn.length > 0 && drawn.every((d, i) => ev[i] && ev[i].ev === d.ev && JSON.stringify(ev[i].data) === JSON.stringify(d.data)); });
  check('live: AI strokes arrive progressively via draw_begin / draw_path / draw_end and match one template exactly', drawn.length > 10 && !!match, `${drawn.length} events, template ${match}`);
  check('live: timer ticks on both turns', A.events.some((e) => e.ev === 'timer_tick' && e.t < ta) && A.events.some((e) => e.ev === 'timer_tick' && e.t >= ta));
  const before = A.events.filter((e) => e.t >= ta && e.ev !== 'round_end');
  check('live: nothing sent to the human during the AI turn contains the template word', !before.some((e) => JSON.stringify(e.data).includes(`"${match}"`)));
  // guess the 7 template words (paced under the chat rate limit) until one is right
  for (const w of SOLO_AI.AI_DRAW_WORDS) {
    if (L.last(A).status !== 'PLAYING') break;
    A.s.emit('send_chat', { text: w }); await L.sleep(450);
  }
  await L.waitFor(() => A.events.some((e) => e.t >= ta && e.ev === 'round_end'), 3000);
  const end = A.events.find((e) => e.t >= ta && e.ev === 'round_end');
  check('live: guessing the AI word ends the turn; word revealed only at round_end', end && end.data.word === match && end.data.drawerPoints === calculateDrawerScore(1, 1),
    end && JSON.stringify({ word: end.data.word, drawerPoints: end.data.drawerPoints }));
  await L.waitFor(() => !!A.gameOver, 10000);
  const go = A.gameOver;
  check('live: game_over (1 round = HUMAN + AI) has the human score and aiScore; human > 0, AI = drawer points',
    go && go.gameMode === 'SOLO_AI' && typeof go.aiScore === 'number' && go.aiScore === calculateDrawerScore(1, 1) && go.finalScores[0].score > 0, go && JSON.stringify({ ai: go.aiScore, human: go.finalScores[0].score }));
  check('live: exactly 2 turns were played (round_start × 2)', A.events.filter((e) => e.t >= t0 && e.ev === 'round_start').length === 2);
  await L.waitFor(() => L.last(A).status === 'LOBBY', 15000);
  check('live: GAME_OVER_DELAY_MS returns to LOBBY; aiScore reset, no soloTurn', L.last(A).status === 'LOBBY' && L.last(A).aiScore === 0 && L.last(A).soloTurn === null);
  L.closeAll(A);
}

(async () => {
  await inProcess();
  await live();
  L.finish();
})();
