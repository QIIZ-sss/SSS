// D1 through the REAL UI against the REAL server (headless Chrome + live socket.io, TEST_PORT):
// host creates a room in the UI, picks a difficulty in Settings, presses START; a second player (socket in the same
// page) readies up and plays. Every word set actually offered to a drawer is checked against that difficulty's pool.
// Run: LIVE_SOCKET=1 DEV=1 node tests/lib/browser.js tests/e2e/d1-difficulty-ui.live.jsx   (server must run on TEST_PORT;
//      check_all.sh does this). PAGE_QUERY=level=EASY|MEDIUM|HARD picks the level (default HARD).
// Fails against a server without D1 (e.g. 1da3310): the click is not confirmed and words come from every level.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { io } from 'socket.io-client';
import App from '../../client/src/App.jsx';
import { socket as appSocket } from '../../client/src/services/socket';
import db from '../../server/src/config/database.js';
import { WORD_DIFFICULTY } from '../../shared/contract.js';

window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
window.alert = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const step = (m) => { out.textContent = `PENDING step: ${m}\n` + results.join('\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await sleep(50); } return !!fn(); };
const URL = `http://127.0.0.1:${process.env.TEST_PORT || '4100'}`;
const LEVEL = new URLSearchParams(location.search).get('level') || WORD_DIFFICULTY.HARD;
const pool = (d) => db.words.filter((w) => w.difficulty === d).map((w) => w.word);
const btn = (re, scope = document) => [...scope.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const click = (el) => act(() => { el.click(); });
const setInput = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

(async () => {
  localStorage.setItem('game_username', 'HostUI');
  sessionStorage.clear();
  const root = createRoot(document.getElementById('root'));
  act(() => root.render(<App />));

  step('render');
  // Host creates a room through the UI
  await waitFor(() => btn(/CREATE PRIVATE ROOM/));
  await waitFor(() => appSocket.connected, 10000);
  step(`socket connected: ${appSocket.connected}`);
  click(btn(/CREATE PRIVATE ROOM/));
  await waitFor(() => document.getElementById('roomCodeDisplay'));
  const code = document.getElementById('roomCodeDisplay').textContent.replace('#', '').trim();
  check('host created a room in the UI', /^\d{5}$/.test(code), code);

  step('room created');
  // Second player (raw socket) joins and readies up; it also records every word set it is offered
  const guest = io(URL, { transports: ['websocket'], forceNew: true });
  const offered = []; let guestLast = null; let hostWord = null;
  guest.on('room_data', (d) => { guestLast = d; });
  guest.on('word_selection', ({ words }) => { offered.push({ by: 'guest', words }); setTimeout(() => guest.emit('select_word', { word: words[0] }), 100); });
  await new Promise((r) => guest.emit('join_room', { code, username: 'GuestUI' }, r));
  guest.emit('toggle_ready');

  step('guest joined');
  // Host picks the difficulty in the lobby's match settings (T1-14: one view, no tab)
  await waitFor(() => btn(new RegExp(`^${LEVEL}$`)));
  click(btn(new RegExp(`^${LEVEL}$`)));
  await waitFor(() => guestLast && guestLast.wordDifficulty === LEVEL, 3000);
  check(`server room state is ${LEVEL} after the UI click (seen by the other player)`, guestLast && guestLast.wordDifficulty === LEVEL, guestLast && String(guestLast.wordDifficulty));
  check(`UI shows ${LEVEL} selected`, btn(new RegExp(`^${LEVEL}$`)).getAttribute('aria-pressed') === 'true');

  step('difficulty picked');
  // Start through the UI
  await waitFor(() => btn(/START GAME/) && !btn(/START GAME/).disabled, 5000);
  click(btn(/START GAME/));

  // Play: when the host is the drawer, read the word buttons from the UI and pick one; the guest guesses it.
  // When the guest draws, the host guesses through the chat input.
  const end = Date.now() + 120000;
  let lastTurn = '';
  while (Date.now() < end) {
    if (guestLast && guestLast.status === 'GAME_OVER') break;
    const header = [...document.querySelectorAll('h3')].find((h) => /SELECT WORD TO DRAW/.test(h.textContent));
    const turn = guestLast ? `${guestLast.currentRound}:${guestLast.currentDrawer}` : '';
    if (header && turn !== lastTurn) {
      lastTurn = turn;
      const words = [...header.parentElement.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((w) => !/GOT IT/.test(w));
      offered.push({ by: 'host-ui', words });
      hostWord = words[0];
      click([...header.parentElement.querySelectorAll('button')].find((b) => b.textContent.trim() === hostWord));
      await waitFor(() => guestLast && guestLast.status === 'PLAYING', 3000);
      guest.emit('send_chat', { text: hostWord });
    }
    if (guestLast && guestLast.status === 'PLAYING' && guestLast.currentDrawer === 'GuestUI') {
      const guestWord = offered.filter((o) => o.by === 'guest').pop();
      const input = document.querySelector('form input[type="text"]');
      if (guestWord && input && !input.disabled && input.dataset.sent !== turn) {
        input.dataset.sent = turn;
        setInput(input, guestWord.words[0]);
        act(() => { input.form.requestSubmit(); });
      }
    }
    await sleep(100);
  }
  step('loop finished');
  const all = offered.flatMap((o) => o.words);
  const allowed = pool(LEVEL);
  check('match reached GAME_OVER', guestLast && guestLast.status === 'GAME_OVER', guestLast && guestLast.status);
  check(`received several word sets (${offered.length}: ${offered.filter((o) => o.by === 'host-ui').length} read from the host UI)`, offered.length >= 4);
  check(`EVERY offered word is in the ${LEVEL} pool [${allowed.join(', ')}]`, all.length > 0 && all.every((w) => allowed.includes(w)),
    `outside: ${all.filter((w) => !allowed.includes(w)).join(', ') || 'none'}; offered: ${offered.map((o) => o.by + ':' + o.words.join('/')).join(' | ')}`);
  guest.close();
  out.textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
})();
