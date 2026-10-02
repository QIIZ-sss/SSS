// T1-02: in Team mode the results modal shows both team totals and each player's team; FFA shows neither.
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
const items = () => [...document.querySelectorAll('li')].map((li) => li.textContent);
fire('game_over', { gameMode: 'TEAM', winnerText: 'Team Blue Wins! 🔵', stopped: false, reason: '', teamScores: { Red: { score: 300 }, Blue: { score: 900 } },
  finalScores: [{ username: 'Bo', score: 500, team: 'Blue' }, { username: 'Cy', score: 400, team: 'Blue' }, { username: 'Ann', score: 300, team: 'Red' }] });
const totals = document.getElementById('teamTotals');
check('Team: both team totals shown', !!totals && /TEAM RED: 300 PTS/.test(totals.textContent) && /TEAM BLUE: 900 PTS/.test(totals.textContent), totals && totals.textContent);
check('Team: ranked rows keep the server order with team labels', items()[0].includes('#1 Bo (Blue)') && items()[2].includes('#3 Ann (Red)'), items().join(' | '));
fire('room_data', { code: '1', status: 'LOBBY', players: [], teams: { Red: { score: 0 }, Blue: { score: 0 } } });
fire('game_over', { gameMode: 'MULTIPLAYER_FFA', winnerText: 'Winner: Bo 🏆', stopped: false, reason: '', teamScores: { Red: { score: 0 }, Blue: { score: 0 } },
  finalScores: [{ username: 'Bo', score: 500, team: 'Red' }, { username: 'Ann', score: 300, team: 'Red' }] });
check('FFA: no team totals, no team labels', !document.getElementById('teamTotals') && !items().some((t) => t.includes('(Red)')), items().join(' | '));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
