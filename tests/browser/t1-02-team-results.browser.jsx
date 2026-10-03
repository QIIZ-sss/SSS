// T1-02 (presentation updated in T1-25): Team results show both team totals and each team's own players; FFA shows no teams.
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
const tot = (t) => (document.getElementById(`teamTotal-${t}`) || {}).textContent;
check('Team: both team totals shown', tot('Red') === '300 PTS' && tot('Blue') === '900 PTS', `${tot('Red')} / ${tot('Blue')}`);
const teamRows = (t) => [...document.querySelectorAll(`#ranking-${t} > li`)].map((li) => li.textContent);
check('Team: each team lists its own players in server order (Blue: Bo, Cy; Red: Ann)', teamRows('Blue').length === 2 && teamRows('Blue')[0].includes('Bo')
  && teamRows('Blue')[1].includes('Cy') && teamRows('Red').length === 1 && teamRows('Red')[0].includes('Ann'), `${teamRows('Blue').join(' | ')} || ${teamRows('Red').join(' | ')}`);
fire('room_data', { code: '1', status: 'LOBBY', players: [], teams: { Red: { score: 0 }, Blue: { score: 0 } } });
fire('game_over', { gameMode: 'MULTIPLAYER_FFA', winnerText: 'Winner: Bo 🏆', stopped: false, reason: '', teamScores: { Red: { score: 0 }, Blue: { score: 0 } },
  finalScores: [{ username: 'Bo', score: 500, team: 'Red' }, { username: 'Ann', score: 300, team: 'Red' }] });
check('FFA: no team sections or totals', !document.getElementById('teamResults') && !document.getElementById('teamTotal-Red') && !!document.getElementById('fullRanking'), items().join(' | '));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
