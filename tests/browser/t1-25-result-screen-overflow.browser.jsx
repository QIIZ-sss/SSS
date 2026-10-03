// T1-25: result screen in the real App (socket stub, real Tailwind), checked inside 375 px and 820 px frames:
// FFA / Team / Solo fit without horizontal overflow (also inside the scrolling card), LEAVE ROOM leaves, and the screen
// closes when the room returns to LOBBY (GAME_OVER_DELAY_MS auto-return). Needs REAL_HEAD=1.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import { handlers, emitted } from '../lib/socket-stub.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const WIDTHS = [375, 820];
const inner = Number((location.search.match(/inner=(\d+)/) || [])[1] || 0);

const FFA = { gameMode: 'MULTIPLAYER_FFA', winnerText: 'x', stopped: false, reason: '', teamScores: { Red: { score: 0 }, Blue: { score: 0 } },
  finalScores: [['Annabelle_long', 900], ['Bo', 500], ['Cy', 500], ['Dee', 0], ['Eve', 0], ['Fay', 0], ['Gus', 0], ['Hal', 0]].map(([u, s]) => ({ username: u, avatar: '🐶', score: s, team: 'Red' })) };
const TEAM = { gameMode: 'TEAM', winnerText: 'x', stopped: false, reason: '', teamScores: { Red: { score: 900 }, Blue: { score: 1800 } },
  finalScores: [['Annabelle_long', 900, 'Red'], ['Bo', 700, 'Blue'], ['Dee', 600, 'Blue'], ['Eve', 500, 'Blue'], ['Cy', 0, 'Red'], ['Fay', 0, 'Blue']]
    .map(([u, s, t]) => ({ username: u, avatar: '🐶', score: s, team: t })) };
const SOLO = { gameMode: 'SOLO_AI', winnerText: 'x', stopped: false, reason: '', teamScores: { Red: { score: 0 }, Blue: { score: 0 } },
  finalScores: [{ username: 'Annabelle_long', avatar: '🐶', score: 1500, team: 'Red' }] };

if (!inner) { // outer page: one frame per width, collect their reports
  const lines = []; let k = 0;
  const nextFrame = () => {
    if (k >= WIDTHS.length) { out.textContent = lines.join('\n') + `\n\n${lines.filter((l) => l.startsWith('PASS')).length}/${lines.length} PASS`; return; }
    const w = WIDTHS[k++];
    const f = document.createElement('iframe');
    f.style.width = w + 'px'; f.style.height = '800px'; f.style.border = '0';
    f.src = location.pathname + '?inner=' + w;
    const onMsg = (e) => { window.removeEventListener('message', onMsg); lines.push(...String(e.data).split('\n').filter(Boolean)); f.remove(); nextFrame(); };
    window.addEventListener('message', onMsg);
    document.body.prepend(f);
  };
  nextFrame();
} else {
  const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  @${inner}px ${n}${d ? '  — ' + d : ''}`);
  window.addEventListener('error', (e) => { window.parent.postMessage('FAIL  script error: ' + e.message, '*'); });
  localStorage.setItem('game_username', 'Annabelle_long');
  const root = createRoot(document.getElementById('root'));
  act(() => root.render(<App />));
  const fire = (ev, data) => act(() => (handlers[ev] || []).forEach((fn) => fn(data)));
  const screen = () => document.getElementById('resultScreen');
  const fits = (name) => {
    const card = screen(); const vw = document.documentElement.clientWidth; const r = card.getBoundingClientRect();
    const wide = [...card.querySelectorAll('*')].filter((el) => { const q = el.getBoundingClientRect(); return q.width && (q.right > r.right + 1 || q.left < r.left - 1); });
    // card fills the width up to 560 px and is centred
    const want = Math.min(560, vw - 2 * (vw >= 640 ? 16 : 8));
    check(`${name}: card ${want} px wide and centred, nothing wider than the card, no sideways scroll`, Math.abs(r.width - want) <= 2
      && Math.abs(r.left - (vw - r.right)) <= 2 && card.scrollWidth <= card.clientWidth + 1 && wide.length === 0 && document.documentElement.scrollWidth <= vw,
      `card ${Math.round(r.left)}..${Math.round(r.right)} / ${vw} (want ${want} wide), scrollW ${card.scrollWidth}/${card.clientWidth}, wide ${wide.length}`);
  };
  const settle = () => new Promise((res) => setTimeout(res, 700)); // the Tailwind CDN builds CSS for new classes asynchronously
  const run = async () => {
    fire('game_over', FFA); await settle(); fits('FFA (8 players)');
    check('FFA: podium shows 3, full ranking lists all 8 incl. 0-point players', document.querySelectorAll('#podium > li').length === 3 && document.querySelectorAll('#fullRanking > li').length === 8);
    fire('game_over', TEAM); await settle(); fits('Team (2 teams)');
    check('Team: winning team first', document.querySelector('#teamResults > section').id === 'team-Blue');
    fire('game_over', SOLO); await settle(); fits('Solo');
    check('Solo: score shown', /1500 PTS/.test(document.getElementById('soloScore').textContent));
    // GAME_OVER lifecycle: the server returns the room to LOBBY after GAME_OVER_DELAY_MS → the screen closes
    fire('room_data', { code: '1', status: 'LOBBY', host: 'Annabelle_long', gameMode: 'MULTIPLAYER_FFA', players: [], teams: { Red: { score: 0 }, Blue: { score: 0 } } });
    check('room back in LOBBY (auto-return) → result screen closes', !screen());
    // LEAVE ROOM leaves the room
    fire('game_over', FFA);
    const n = emitted.filter((e) => e.ev === 'leave_room').length;
    act(() => document.getElementById('leaveRoomButton').click());
    check('LEAVE ROOM → leave_room sent, screen closed, back on the home screen', emitted.filter((e) => e.ev === 'leave_room').length === n + 1 && !screen()
      && !!document.getElementById('createRoomButton'));
    window.parent.postMessage(results.join('\n'), '*');
  };
  const safeRun = () => run().catch((e) => { results.push(`FAIL  @${inner}px script error: ${e.message}`); window.parent.postMessage(results.join('\n'), '*'); });
  const waitTw = () => (window.tailwind ? setTimeout(safeRun, 1500) : setTimeout(waitTw, 200));
  waitTw();
}
