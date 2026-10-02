// T1-17 / T1-16: on first load the main action (CREATE PRIVATE ROOM) is inside the viewport; the lobby mini-challenge cards
// have no empty band between the icon row and the text. Needs REAL_HEAD=1 (Tailwind).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
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
