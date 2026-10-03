// T1-17 / T1-16: on first load the main action (CREATE PRIVATE ROOM) is inside the viewport; the lobby mini-challenge cards
// have no empty band between the icon row and the text; on desktop the PUBLIC ROOM BROWSER is a card as tall as the setup
// card (no blank area beside it), and many rooms scroll inside it. Needs REAL_HEAD=1 (Tailwind).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import { handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Ann');
const host = document.getElementById('root');
out.style.display = 'none';
let root = createRoot(host);
act(() => root.render(<App />));
const room = { code: '12345', name: 'R', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null, status: 'LOBBY',
  teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: true, team: 'Blue' }] };
const run = () => {
  window.scrollTo(0, 0);
  const btn = document.getElementById('createRoomButton');
  const r = btn && btn.getBoundingClientRect();
  check(`home: CREATE PRIVATE ROOM visible without scrolling (window ${innerWidth}×${innerHeight})`, r && r.top >= 0 && r.bottom <= innerHeight + 1,
    r ? `top ${Math.round(r.top)} bottom ${Math.round(r.bottom)}` : 'no button');
  // T1-17 (P5): room browser card next to the setup card, same top and bottom, nothing blank beside the setup card
  const setup = btn.closest('.lg\\:col-span-5').firstElementChild;
  const browser = (document.getElementById('roomBrowserPanel') || document.querySelector('.lg\\:col-span-7')).firstElementChild;
  const s1 = setup.getBoundingClientRect(), b1 = browser.getBoundingClientRect();
  const box = (r) => `${Math.round(r.top)}–${Math.round(r.bottom)}`;
  check('home: room browser is a card aligned with the setup card (same top / bottom ±2 px)',
    getComputedStyle(browser).borderTopWidth === '4px' && Math.abs(s1.top - b1.top) <= 2 && Math.abs(s1.bottom - b1.bottom) <= 2, `setup ${box(s1)}, browser ${box(b1)}`);
  const docH = document.documentElement.scrollHeight;
  const rooms = Array.from({ length: 20 }, (_, k) => ({ id: `r${k}`, code: `${10000 + k}`, name: `Room ${k}`, host: 'X', gameMode: 'MULTIPLAYER_FFA', roundTime: 60, playerCount: 1, maxPlayers: 8 }));
  act(() => (handlers.room_list_updated || []).forEach((fn) => fn(rooms)));
  const b2 = browser.getBoundingClientRect();
  check('home: 20 rooms scroll inside the card (card and page height unchanged)', browser.scrollHeight > browser.clientHeight + 100
    && Math.abs(b2.height - b1.height) <= 2 && document.documentElement.scrollHeight === docH,
    `card ${Math.round(b1.height)}→${Math.round(b2.height)} px, content ${browser.scrollHeight} px, page ${docH}→${document.documentElement.scrollHeight}`);
  act(() => root.unmount()); root = createRoot(host);
  act(() => root.render(<RoomLobby roomData={room} username="Ann" />));
  setTimeout(() => {
    const cards = [...host.querySelectorAll('h4')].filter((h) => /STANDARD|COLOUR|LIFT|GEOMETRIC/i.test(h.textContent)).map((h) => h.closest('[class*="rounded-lg"]'));
    const gaps = cards.map((c) => {
      const icon = c.firstElementChild.getBoundingClientRect(); const title = c.querySelector('h4').getBoundingClientRect();
      return Math.round(title.top - icon.bottom);
    });
    check('lobby: 4 mini-challenge cards, text right below the icon row (gap ≤ 16 px, no empty band)', cards.length === 4 && gaps.every((g) => g <= 16), gaps.join(','));
    out.style.display = '';
    out.textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
  }, 800);
};
const waitTw = () => (window.tailwind ? setTimeout(run, 1500) : setTimeout(waitTw, 200));
waitTw();
