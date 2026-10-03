// T1-14: the merged lobby settings send the same update_room_settings payloads as before (host), nothing for a guest;
// mini-challenge cards still toggle (and keep at least one enabled).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import { emitted } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = { code: '1', host: 'Host', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, status: 'LOBBY', wordDifficulty: null,
  enabledChallenges: ['NONE', 'COLOUR_FIX'], teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'Host', score: 0, isReady: false, team: 'Red' }, { username: 'Guest', score: 0, isReady: true, team: 'Blue' }] };
const host = document.getElementById('root');
const root = createRoot(host);
const button = (label) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
const card = (name) => [...host.querySelectorAll('h4')].find((h) => h.textContent === name).closest('[class*="rounded-lg"]');
const lastSent = () => (emitted.filter((e) => e.ev === 'update_room_settings').pop() || {}).data;
const sends = () => emitted.filter((e) => e.ev === 'update_room_settings').length;

act(() => root.render(<RoomLobby roomData={room} username="Host" />));
const cases = [['90s', { roundTime: 90 }], ['5', { totalRounds: 5 }], ['12', { maxPlayers: 12 }], ['EASY', { wordDifficulty: 'EASY' }], ['TEAM CLASH', { gameMode: 'TEAM' }]];
for (const [label, want] of cases) {
  const b = button(label) || [...host.querySelectorAll('button')].find((x) => x.textContent.includes(label));
  act(() => b.click());
  check(`host clicks ${label} → update_room_settings ${JSON.stringify(want)}`, JSON.stringify(lastSent()) === JSON.stringify(want), JSON.stringify(lastSent()));
}
act(() => card("Don't Lift Pen").click());
check('host clicks a disabled card → enabledChallenges gains it', JSON.stringify(lastSent()) === JSON.stringify({ enabledChallenges: ['NONE', 'COLOUR_FIX', 'DONT_LIFT_PEN'] }), JSON.stringify(lastSent()));
act(() => card('Colour Fix').click());
check('host clicks an enabled card → enabledChallenges drops it', JSON.stringify(lastSent()) === JSON.stringify({ enabledChallenges: ['NONE'] }), JSON.stringify(lastSent()));
let n = sends();
act(() => root.render(<RoomLobby roomData={{ ...room, enabledChallenges: ['NONE'] }} username="Host" />));
act(() => card('Standard Drawing').click());
check('the last enabled card cannot be turned off (nothing sent)', sends() === n);
const solo = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('SOLO VS AI'));
n = sends(); act(() => solo.click());
check('host with another player: SOLO VS AI disabled, click sends nothing, reason visible', solo.disabled && sends() === n
  && /SOLO VS AI unavailable/.test((document.getElementById('soloBlockedReason') || {}).textContent || ''));

act(() => root.render(<RoomLobby roomData={room} username="Guest" />));
n = sends();
['90s', '5', '12', 'EASY'].forEach((l) => act(() => button(l).click()));
act(() => card("Don't Lift Pen").click());
check('guest: clicks on settings and cards send nothing (read-only)', sends() === n && button('90s').disabled);
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
