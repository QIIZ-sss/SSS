// P4.1 (B4) refresh/reconnect with role-based visibility.
const L = require('../lib/e2e-lib');
const has = (obj, w) => new RegExp(`\\b${w}\\b`, 'i').test(JSON.stringify(obj));
async function room2(opts = {}) {
  const A = L.player(L.nextName('H'), { autoGuess: false, autoSelect: opts.autoSelect }), B = L.player(L.nextName('G'), { autoGuess: false });
  const resA = await L.makeRoom(A, { roundTime: opts.roundTime || 60 }); const resB = await L.join(B, resA.code);
  B.s.emit('toggle_ready'); await L.sleep(300);
  return { A, B, code: resA.code, sidA: resA.sessionId, sidB: resB.sessionId };
}
async function refresh(old, code, sessionId, name) { // simulate page refresh: drop socket, new socket rejoins
  old.s.disconnect(); await L.sleep(300);
  const p = L.player(name, { autoGuess: false, autoSelect: false });
  await L.waitFor(() => p.s.connected, 3000);
  const res = await L.emitAck(p.s, 'rejoin_room', { code, sessionId });
  await L.sleep(400);
  return { p, res };
}
(async () => {
  { // W1: guesser refresh mid-PLAYING keeps room + score, no answer leak
    const { A, B, code, sidA, sidB } = await room2();
    L.check('W1 create/join acks carry a sessionId', typeof sidA === 'string' && sidA.length >= 16 && typeof sidB === 'string' && sidA !== sidB);
    A.s.emit('start_game');
    await L.waitFor(() => L.last(B)?.status === 'PLAYING', 15000);
    const word = L.ORACLE[code];
    B.s.emit('send_chat', { text: 'nope' }); await L.sleep(200);
    // give B a score first via a guess? keep guesser unguessed to test leak; check score via drawer instead
    const scoreBefore = L.last(A).players.find(p => p.username === B.name).score;
    const { p: B2, res } = await refresh(B, code, sidB, B.name);
    L.check('W1 rejoin succeeds within grace', res && res.success && res.username === B.name, JSON.stringify(res));
    const rd = L.last(B2);
    L.check('W1 back in the same room and same game state', rd && rd.code === code && rd.status === 'PLAYING' && rd.players.length === 2);
    L.check('W1 score preserved', rd.players.find(p => p.username === B.name).score === scoreBefore);
    L.check('W1 reconnected guesser does not receive currentWord in PLAYING', B2.events.every(e => !has(e.data, word)), `word=${word}`);
    L.check('W1 reconnected guesser got wordLength', rd.wordLength === word.length && rd.currentWord === '');
    B2.s.emit('send_chat', { text: word });
    L.check('W1 rejoined player can still guess (scores)', await L.waitFor(() => B2.chats.some(m => m.isCorrectNotice), 2000));
    L.closeAll(A, B2);
  }
  { // W2: drawer refresh in WORD_SELECTION gets candidates again; in PLAYING gets the word
    const { A, B, code, sidA } = await room2({ autoSelect: false });
    A.s.emit('start_game');
    await L.waitFor(() => A.words, 5000);
    const words = A.words;
    const { p: A2, res } = await refresh(A, code, sidA, A.name);
    L.check('W2 drawer rejoin succeeds', res && res.success);
    const ws = A2.events.find(e => e.ev === 'word_selection');
    L.check('W2 drawer receives candidate words again after refresh', ws && JSON.stringify(ws.data.words) === JSON.stringify(words));
    L.check('W2 guesser received no candidate words', B.events.every(e => e.ev !== 'word_selection' && words.every(w => !has(e.data, w))));
    L.check('W2 host status preserved after refresh', L.last(A2).host === A.name);
    A2.s.emit('select_word', { word: words[1] });
    await L.waitFor(() => L.last(A2)?.status === 'PLAYING', 3000);
    L.check('W2 drawer sees currentWord in PLAYING after refresh', L.last(A2).currentWord === words[1]);
    L.check('W2 guesser still has no currentWord', L.last(B).currentWord === '');
    L.closeAll(A2, B);
  }
  { // W3: invalid / stale sessions are rejected; explicit leave invalidates the session
    const { A, B, code, sidB } = await room2();
    const X = L.player(L.nextName('X'), { autoGuess: false });
    await L.waitFor(() => X.s.connected, 3000);
    const bad = await L.emitAck(X.s, 'rejoin_room', { code, sessionId: 'deadbeef' });
    L.check('W3 unknown sessionId rejected', bad && bad.success === false && !X.frames.length);
    const bad2 = await L.emitAck(X.s, 'rejoin_room', { code: { $ne: 1 }, sessionId: sidB });
    L.check('W3 malformed payload rejected', bad2 && bad2.success === false);
    B.s.emit('leave_room'); await L.sleep(300);
    const stale = await L.emitAck(X.s, 'rejoin_room', { code, sessionId: sidB });
    L.check('W3 session invalid after explicit leave', stale && stale.success === false);
    L.closeAll(A, B, X);
  }
  { // W4: grace expiry removes the player; drawer expiry ends the turn
    const { A, B, code } = await room2();
    const C = L.player(L.nextName('C'), { autoGuess: false }); await L.join(C, code); C.s.emit('toggle_ready'); await L.sleep(300);
    A.s.emit('start_game');
    await L.waitFor(() => L.last(B)?.status === 'PLAYING', 15000);
    const t0 = Date.now();
    A.s.disconnect(); // drawer drops and never returns
    await L.sleep(1000);
    L.check('W4 disconnected drawer kept in the room during grace', L.last(B).players.some(p => p.username === A.name) && L.last(B).status === 'PLAYING');
    await L.waitFor(() => B.events.some(e => e.ev === 'round_end' && /drawer left/i.test(e.data.reason)), 40000);
    const dt = (Date.now() - t0) / 1000;
    L.check('W4 drawer removed after RECONNECT_GRACE_MS (~30 s) and the turn ends', dt >= 29 && dt <= 32, `${dt.toFixed(1)} s`);
    L.check('W4 host passed to a connected player', L.last(B).host !== A.name, L.last(B).host);
    L.closeAll(B, C);
  }
  { // W5: same-name join takes the slot and invalidates the old session
    const { A, B, code, sidB } = await room2();
    B.s.disconnect(); await L.sleep(300);
    const B3 = L.player(B.name, { autoGuess: false }); const r3 = await L.join(B3, code);
    const X = L.player(L.nextName('X')); await L.waitFor(() => X.s.connected, 3000);
    const old = await L.emitAck(X.s, 'rejoin_room', { code, sessionId: sidB });
    L.check('W5 same-name join issues a new session and the old one stops working', r3.sessionId && r3.sessionId !== sidB && old.success === false);
    L.closeAll(A, B3, X);
  }
  L.finish();
})();
