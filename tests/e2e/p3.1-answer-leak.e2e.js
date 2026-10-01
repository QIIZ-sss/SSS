// P3.1 (A1) answer leakage: scan EVERY event a non-drawer receives while the turn is secret.
const L = require('../lib/e2e-lib');
const has = (obj, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(JSON.stringify(obj));
(async () => {
  const A = L.player(L.nextName('A')), B = L.player(L.nextName('B')), C = L.player(L.nextName('C'), { autoGuess: false });
  const { code } = await L.makeRoom(A, { roundTime: 6 }); await L.join(B, code); await L.join(C, code);
  A.s.emit('update_room_settings', { totalRounds: 1 }); B.s.emit('toggle_ready'); C.s.emit('toggle_ready'); await L.sleep(300);
  // record candidate lists per turn (drawer side)
  const candidates = [];
  [A, B, C].forEach(p => p.s.on('word_selection', ({ words }) => candidates.push({ drawer: p.name, words, t: Date.now() })));
  A.s.emit('start_game');
  // mid-game joiner during the first PLAYING turn
  let D = null;
  await L.waitFor(() => L.last(B)?.status === 'PLAYING', 15000);
  D = L.player(L.nextName('D'), { autoGuess: false }); await L.join(D, code);
  await L.waitFor(() => A.frames.some(f => f.status === 'GAME_OVER'), 120000);
  const players = [A, B, C, D];
  // Build secret windows per turn from the drawer's perspective: [round_change .. round_end)
  let leaks = [], candLeaks = [], checkedEvents = 0, drawerSaw = 0, guesserReveal = 0, turnsChecked = 0;
  for (const cand of candidates) {
    const drawer = players.find(p => p.name === cand.drawer);
    const end = drawer.events.find(e => e.ev === 'round_end' && e.t >= cand.t);
    if (!end) continue;
    turnsChecked++;
    const word = end.data.word;
    if (drawer.frames.some(f => f.status === 'PLAYING' && f.currentWord === word && f.t >= cand.t && f.t <= end.t)) drawerSaw++;
    for (const p of players) {
      if (p === drawer) continue;
      if (p.events.some(e => e.ev === 'word_selection' && e.t >= cand.t - 50 && e.t <= end.t)) candLeaks.push(`${p.name} got word_selection`);
      // window per player: from the turn start to THIS player's own round_end (per-socket order is preserved)
      const pEnd = p.events.find(e => e.ev === 'round_end' && e.t >= cand.t - 50 && e.data.word === word);
      const pStartIdx = p.events.findIndex(e => e.t >= cand.t - 50);
      const pEndIdx = pEnd ? p.events.indexOf(pEnd) : p.events.length;
      for (const e of p.events.slice(pStartIdx < 0 ? p.events.length : pStartIdx, pEndIdx)) {
        if (e.ev === 'round_end') continue;
        checkedEvents++;
        if (has(e.data, word)) leaks.push(`${p.name} ${e.ev} status=${e.data.status} round=${e.data.currentRound} drawer=${e.data.currentDrawer} cw=${e.data.currentWord} word=${word} dt=${e.t - cand.t} tEnd=${end.t - e.t}`);
        for (const w of cand.words.filter(w => w !== word)) if (has(e.data, w)) candLeaks.push(`${p.name} ${e.ev} has candidate ${w}`);
      }
      const ro = p.frames.find(f => f.status === 'ROUND_OVER' && f.t >= end.t - 50);
      if (ro && ro.currentWord === word) guesserReveal++;
    }
  }
  L.check('A1 turns analysed (3 drawers)', turnsChecked === 3, String(turnsChecked));
  L.check('A1 no non-drawer received the answer in any event during WORD_SELECTION/PLAYING (incl. after a correct guess and mid-game join)', leaks.length === 0, leaks.length ? leaks.slice(0, 3).join(' || ') : `${checkedEvents} events scanned`);
  L.check('A1 candidate words reach only the drawer', candLeaks.length === 0, candLeaks.slice(0, 3).join(' || '));
  L.check('A1 drawer still receives currentWord during PLAYING', drawerSaw === turnsChecked, `${drawerSaw}/${turnsChecked}`);
  L.check('A1 non-drawers receive the answer in ROUND_OVER', guesserReveal >= turnsChecked * 2, `${guesserReveal} reveals`);
  L.check('A1 wordLength still sent to guessers', B.frames.some(f => f.status === 'PLAYING' && f.wordLength > 0 && f.currentWord === ''));
  const notice = B.chats.concat(C.chats).find(m => m.isCorrectNotice);
  L.check('A1 correct-guess notice is neutral (no answer text)', notice && !candidates.some(c => has(notice, c.words[0])), notice && notice.text);
  L.closeAll(A, B, C, D); L.finish();
})();
