// T1-03: Solo vs AI shows the server round timer (timer_tick), and TimerBadge formats minutes (90 s → 01:30).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import SoloAIGame from '../../client/src/gameModes/SoloAIGame.jsx';
import TimerBadge from '../../client/src/components/TimerBadge.jsx';
import { handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const host = document.getElementById('root');
const root = createRoot(host);
const timer = () => { const el = document.getElementById('countdown-timer'); return el ? el.textContent : null; };
const room = { code: '7', host: 'Solo', gameMode: 'SOLO_AI', status: 'PLAYING', currentRound: 1, totalRounds: 3, currentDrawer: 'Solo', currentWord: 'Clock',
  wordLength: 5, timeRemaining: 90, currentChallenge: 'NONE', forcedColor: null, teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'Solo', score: 0, team: 'Red' }] };

act(() => root.render(<SoloAIGame roomData={room} username="Solo" />));
check('Solo PLAYING shows the timer badge with the room time (90 s → 01:30)', timer() === '01:30', String(timer()));
act(() => (handlers.timer_tick || []).forEach((fn) => fn({ timeRemaining: 59 })));
check('timer_tick from the server updates it (59 → 00:59)', timer() === '00:59', String(timer()));
act(() => root.render(<SoloAIGame roomData={{ ...room, status: 'ROUND_OVER' }} username="Solo" />));
check('no timer badge outside PLAYING', timer() === null);
act(() => root.unmount());
const r2 = createRoot(host);
const fmt = (s) => { act(() => r2.render(<TimerBadge seconds={s} />)); return timer(); };
const cases = [[5, '00:05'], [60, '01:00'], [180, '03:00'], [0, '00:00'], [-3, '00:00']];
const bad = cases.filter(([s, want]) => fmt(s) !== want).map(([s, want]) => `${s}→${fmt(s)} (want ${want})`);
check('TimerBadge formats MM:SS (5, 60, 180, 0, negative)', bad.length === 0, bad.join('; '));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
