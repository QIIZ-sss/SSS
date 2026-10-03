// T1-15: a Team lobby shows a team picker (counts, my team marked) and team badges; clicking the other team emits switch_team.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import { emitted } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = (mode) => ({ code: '12345', name: 'R', host: 'Ann', gameMode: mode, maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null, status: 'LOBBY',
  teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: true, team: 'Red' }] });
const root = createRoot(document.getElementById('root'));
act(() => root.render(<RoomLobby roomData={room('TEAM')} username="Bob" />));
const picker = document.getElementById('teamPicker');
const btn = (t) => [...picker.querySelectorAll('button')].find((b) => b.textContent.includes(t));
check('Team lobby: picker with counts (Red 2, Blue 0)', picker && /RED.*\(2\)/.test(btn('RED').textContent) && /BLUE.*\(0\)/.test(btn('BLUE').textContent),
  picker && picker.textContent);
check('my team marked and disabled', btn('RED').getAttribute('aria-pressed') === 'true' && btn('RED').disabled && btn('RED').textContent.includes('✓'));
check('team badges in the roster', (document.body.textContent.match(/Red/g) || []).length >= 2);
act(() => btn('BLUE').click());
const sent = emitted.filter((e) => e.ev === 'switch_team').pop();
check('clicking JOIN BLUE emits switch_team {team: "Blue"}', sent && sent.data.team === 'Blue', sent && JSON.stringify(sent.data));
check('the Team start rule is explained to the host', (() => { act(() => root.render(<RoomLobby roomData={room('TEAM')} username="Ann" />)); return document.body.textContent.includes('Each team needs at least'); })());
act(() => root.render(<RoomLobby roomData={room('MULTIPLAYER_FFA')} username="Bob" />));
check('FFA lobby: no team picker', !document.getElementById('teamPicker'));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
