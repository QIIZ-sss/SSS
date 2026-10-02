// T1-22: the results modal says MATCH STOPPED and shows the reason when game_over has stopped=true; normal results unchanged.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import { handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Ann');
const root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
const fire = (ev, data) => act(() => (handlers[ev] || []).forEach((fn) => fn(data)));
const text = () => document.body.textContent;
const scores = [{ username: 'Ann', avatar: '🐶', score: 120, team: 'Red' }];

fire('game_over', { winnerText: 'Match stopped', finalScores: scores, teamScores: { Red: { score: 0 }, Blue: { score: 0 } }, stopped: true,
  reason: 'Not enough players left — the match was stopped.' });
check('stopped match: heading MATCH STOPPED', text().includes('MATCH STOPPED') && !text().includes('MATCH RESULTS'));
check('stopped match: reason shown', !!document.getElementById('matchStoppedReason') && text().includes('Not enough players left'));
check('stopped match: standings still listed', text().includes('120 PTS'));
fire('room_data', { code: '1', status: 'LOBBY', players: [], teams: { Red: { score: 0 }, Blue: { score: 0 } } });
check('modal closes when the room returns to LOBBY', !text().includes('MATCH STOPPED'));
fire('game_over', { winnerText: 'Winner: Ann 🏆', finalScores: scores, teamScores: { Red: { score: 0 }, Blue: { score: 0 } }, stopped: false, reason: '' });
check('normal match: MATCH RESULTS, no stop reason', text().includes('MATCH RESULTS') && !document.getElementById('matchStoppedReason'));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
