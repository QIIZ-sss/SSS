import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import App from '../../client/src/App.jsx';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import TeamGame from '../../client/src/gameModes/TeamGame.jsx';
import SoloAIGame from '../../client/src/gameModes/SoloAIGame.jsx';
import Leaderboard from '../../client/src/components/Leaderboard.jsx';

window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ success: true, leaderboard: [] }) });
const out = document.getElementById('out');
const results = [];
const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = {
  id: '83921', code: '83921', name: 'Room', host: 'Alice', maxPlayers: 8, roundTime: 60, totalRounds: 3, currentRound: 2, currentDrawer: 'Alice',
  status: 'PLAYING', currentWord: 'Elephant', wordLength: 8, correctGuessersCount: 0, currentChallenge: 'COLOUR_FIX', forcedColor: '#EF4444', timeRemaining: 42,
  enabledChallenges: ['NONE', 'COLOUR_FIX', 'DONT_LIFT_PEN', 'GEOMETRIC_ONLY'], miniChallengeEnabled: true, gameMode: 'MULTIPLAYER_FFA',
  teams: { Red: { score: 1200 }, Blue: { score: 900 } },
  players: ['Alice', 'Bobby_long_name', 'Chai', 'Dao'].map((u, i) => ({ username: u, avatar: '🐶', score: 300 * i, isReady: i % 2 === 0, team: i % 2 ? 'Blue' : 'Red' })),
};
const screens = [
  ['Login', () => { localStorage.clear(); return <App />; }],
  ['Home (create/join)', () => { localStorage.setItem('game_username', 'Bobby_long_name'); return <App />; }],
  ['Room lobby (host)', () => <RoomLobby roomData={{ ...room, status: 'LOBBY' }} username="Alice" />],
  ['FFA game (drawer)', () => <MultiplayerGame roomData={room} username="Alice" wordOptions={[]} />],
  ['FFA game (guesser, ROUND_OVER)', () => <MultiplayerGame roomData={{ ...room, status: 'ROUND_OVER' }} username="Chai" wordOptions={[]} />],
  ['FFA word selection (drawer)', () => <MultiplayerGame roomData={{ ...room, status: 'WORD_SELECTION', currentWord: '' }} username="Alice" wordOptions={['Helicopter', 'Eiffel Tower', 'Basketball']} />],
  ['Team game (guesser)', () => <TeamGame roomData={{ ...room, gameMode: 'TEAM' }} username="Bobby_long_name" wordOptions={[]} />],
  ['Solo AI', () => <SoloAIGame roomData={{ ...room, gameMode: 'SOLO_AI', players: [room.players[0]] }} username="Alice" />],
  ['Leaderboard', () => <Leaderboard />],
];
const host = document.getElementById('root');
let root = createRoot(host);
const vw = document.documentElement.clientWidth;
const describe = (el) => {
  const r = el.getBoundingClientRect();
  const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 4).join('.') : '';
  return `${el.tagName.toLowerCase()}.${cls} "${(el.textContent || '').trim().slice(0, 20)}" [${Math.round(r.left)}..${Math.round(r.right)}]`;
};
const overflowing = () => [...host.querySelectorAll('*')].filter((el) => {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  let p = el.parentElement;
  while (p && p !== host) {
    if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return false;
    p = p.parentElement;
  }
  return r.right > vw + 1 || r.left < -1;
});
let i = 0;
function next() {
  if (i >= screens.length) {
    out.textContent = `viewport ${vw}px\n` + results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
    return;
  }
  const [name, make] = screens[i++];
  root.unmount();
  root = createRoot(host);
  flushSync(() => root.render(make()));
  setTimeout(() => {
    const sw = document.documentElement.scrollWidth;
    const bad = overflowing();
    // report the outermost offenders only
    const top = bad.filter((el) => !bad.some((o) => o !== el && o.contains(el))).slice(0, 4).map(describe);
    check(`${name}: no horizontal overflow at ${vw}px`, sw <= vw && bad.length === 0, `scrollWidth=${sw}${top.length ? ' | ' + top.join(' | ') : ''}`);
    next();
  }, 800);
}
const waitTw = () => (window.tailwind ? setTimeout(next, 1500) : setTimeout(waitTw, 200));
// Outer page: load this same page in an iframe of the requested width (headless Chrome's window is >= 500px wide)
const FRAME_W = Number((location.search.match(/w=(\d+)/) || [])[1] || 0);
if (FRAME_W && window === window.parent) {
  const f = document.createElement('iframe');
  f.style.width = FRAME_W + 'px'; f.style.height = '900px'; f.style.border = '0';
  f.src = location.pathname + '?inner=1';
  window.addEventListener('message', (e) => { out.textContent = e.data; });
  document.body.prepend(f);
} else {
  if (window !== window.parent) {
    const finish = () => { if (i >= screens.length && out.textContent !== 'PENDING') window.parent.postMessage(out.textContent, '*'); else setTimeout(finish, 200); };
    finish();
  }
  waitTw();
}
