// T1-18: a failed join (wrong PIN / room not found / Solo / full) shows an inline message — no alert(); editing the PIN clears it.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import RoomList from '../../client/src/components/RoomList.jsx';
import { emitted, responders, handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const alerts = []; window.alert = (m) => alerts.push(m);
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Mali');
const root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
act(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('JOIN GAME')).click());
const boxes = () => [...document.querySelectorAll('input[aria-label^="Room code digit"]')];
const setterOf = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
const type = (el, value) => act(() => { el.focus(); setterOf.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
const submit = () => act(() => { document.querySelector('form button[type="submit"]').click(); });
const err = (id = 'joinError') => { const el = document.getElementById(id); return el ? el.textContent.trim() : null; };

type(boxes()[0], '1'); type(document.activeElement, '2');
submit();
check('incomplete PIN → inline message, nothing sent', /5-digit room code/.test(err() || '') && !emitted.some((e) => e.ev === 'join_room'), String(err()));
responders.join_room = () => ({ success: false, message: 'Room not found. Please check your 5-digit code!' });
type(boxes()[2], '3'); type(document.activeElement, '4'); type(document.activeElement, '5');
check('editing the PIN clears the message', err() === null);
submit();
check('room not found → server reason shown inline (role=alert)', err() === 'Room not found. Please check your 5-digit code!'
  && document.getElementById('joinError').getAttribute('role') === 'alert', String(err()));
check('still on the join screen (PIN kept for correction)', boxes().map((b) => b.value).join('') === '12345');
type(boxes()[4], '6');
check('typing again clears it', err() === null);
act(() => root.unmount());

const root2 = createRoot(document.getElementById('root'));
act(() => root2.render(<RoomList username="Mali" avatar="🐶" onJoinRoom={() => {}} />));
act(() => (handlers.room_list_updated || []).forEach((fn) => fn([{ id: '11111', code: '11111', name: 'Gone', host: 'X', gameMode: 'MULTIPLAYER_FFA', playerCount: 1, maxPlayers: 8, status: 'LOBBY' }])));
responders.join_room = () => ({ success: false, message: 'Room is full!' });
act(() => [...document.querySelectorAll('button')].find((b) => /JOIN MATCH/.test(b.textContent)).click());
check('room list: failed join shown inline', err('roomListJoinError') === 'Room is full!', String(err('roomListJoinError')));
check('no window.alert() used anywhere', alerts.length === 0, alerts.join(' | '));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
