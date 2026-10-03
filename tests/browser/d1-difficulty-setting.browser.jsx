// D1 lobby control: host picks a difficulty → update_room_settings { wordDifficulty }; guests see it disabled.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import { emitted } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = { code: '1', host: 'Host', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, status: 'LOBBY', wordDifficulty: null,
  enabledChallenges: ['NONE'], players: [{ username: 'Host', score: 0, isReady: false, team: 'Red' }, { username: 'Guest', score: 0, isReady: true, team: 'Red' }] };
const host = document.getElementById('root');
let root = createRoot(host);
const openSettings = () => {}; // T1-14: settings are in the one lobby view, no tab to open
const levelBtn = (label) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
act(() => root.render(<RoomLobby roomData={room} username="Host" />));
openSettings();
check('difficulty options MIXED / EASY / MEDIUM / HARD shown', ['MIXED', 'EASY', 'MEDIUM', 'HARD'].every((l) => levelBtn(l)));
check('MIXED selected when wordDifficulty is null', levelBtn('MIXED').getAttribute('aria-pressed') === 'true');
act(() => levelBtn('MEDIUM').click());
const sent = emitted.filter((e) => e.ev === 'update_room_settings').pop();
check('host click emits update_room_settings { wordDifficulty: "MEDIUM" }', sent && sent.data.wordDifficulty === 'MEDIUM', sent && JSON.stringify(sent.data));
act(() => levelBtn('MIXED').click());
check('MIXED emits wordDifficulty: null', emitted.filter((e) => e.ev === 'update_room_settings').pop().data.wordDifficulty === null);
act(() => root.render(<RoomLobby roomData={{ ...room, wordDifficulty: 'HARD' }} username="Guest" />));
openSettings();
check('guest sees the host choice (HARD pressed) with buttons disabled', levelBtn('HARD').getAttribute('aria-pressed') === 'true' && levelBtn('EASY').disabled);
const before = emitted.length;
act(() => levelBtn('EASY').click());
check('guest click sends nothing', emitted.length === before);
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
