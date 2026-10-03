// T1-20: the typed room name is sent in the existing create_room `name` field; the room list shows names and shows the
// server's public room as PUBLIC ROOM (no "Host: System").
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import RoomList from '../../client/src/components/RoomList.jsx';
import { emitted, handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Ann');
const host = document.getElementById('root');
let root = createRoot(host);
act(() => root.render(<App />));
const type = (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; act(() => { set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }); };
const input = document.getElementById('roomNameInput');
type(input, 'Art Club');
act(() => document.getElementById('createRoomButton').click());
const sent = emitted.filter((e) => e.ev === 'create_room').pop();
check('typed name sent in create_room.name (existing field, no new event)', sent && sent.data.name === 'Art Club', sent && JSON.stringify(sent.data.name));
check('no new socket event: only create_room emitted on create', emitted.every((e) => ['create_room', 'get_rooms', 'rejoin_room'].includes(e.ev)), [...new Set(emitted.map((e) => e.ev))].join(','));
type(input, '');
act(() => document.getElementById('createRoomButton').click());
const sent2 = emitted.filter((e) => e.ev === 'create_room').pop();
check('empty name: create still works (client default kept, server decides)', sent2 && sent2.data.name === "Ann's Room", sent2 && JSON.stringify(sent2.data.name));
check('input refuses more than 24 characters (maxLength)', input.maxLength === 24);

act(() => root.unmount()); root = createRoot(host);
act(() => root.render(<RoomList username="Ann" avatar="🐶" onJoinRoom={() => {}} />));
act(() => (handlers.room_list_updated || []).forEach((fn) => fn([
  { id: '83921', code: '83921', name: 'Public Neo Lounge 🎨', host: 'System', gameMode: 'MULTIPLAYER_FFA', roundTime: 60, playerCount: 0, maxPlayers: 10 },
  { id: '55555', code: '55555', name: 'Art Club', host: 'Bob', gameMode: 'TEAM', roundTime: 60, playerCount: 2, maxPlayers: 8 },
])));
const cards = [...host.querySelectorAll('h4')].map((h) => h.parentElement.textContent);
check('room list shows both names', cards.some((t) => t.includes('Public Neo Lounge')) && cards.some((t) => t.includes('Art Club')), cards.join(' | '));
check('seed room shows PUBLIC ROOM, not "Host: System"', cards.some((t) => t.includes('Public Neo Lounge') && t.includes('PUBLIC ROOM')) && !/Host: System/.test(host.textContent));
check('player room still shows its host', cards.some((t) => t.includes('Art Club') && t.includes('Host: Bob')));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
