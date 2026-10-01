// B4 client flow in a real DOM: sessionStorage session, rejoin on mount, save on create, clear on LEAVE.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import { emitted, responders, handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const KEY = 'jdi_room_session';
localStorage.setItem('game_username', 'Mali');
const roomData = { id: '11111', code: '11111', name: 'R', host: 'Mali', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3,
  currentRound: 1, currentDrawer: 'Other', status: 'PLAYING', currentWord: '', wordLength: 5, currentChallenge: 'NONE', teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'Mali', score: 120, team: 'Red' }, { username: 'Other', score: 0, team: 'Red' }], enabledChallenges: ['NONE'] };
// 1) "refresh": a session exists before the page mounts
sessionStorage.setItem(KEY, JSON.stringify({ code: '11111', sessionId: 'abc123' }));
responders.rejoin_room = (d) => ({ success: true, roomId: '11111', code: '11111', username: 'Mali' });
let root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
const rj = emitted.find((e) => e.ev === 'rejoin_room');
check('on load with a stored session the client emits rejoin_room {code, sessionId}', rj && rj.data.code === '11111' && rj.data.sessionId === 'abc123', rj && JSON.stringify(rj.data));
act(() => (handlers.room_data || []).forEach((fn) => fn(roomData)));
check('after rejoin the game screen is shown again (not Home)', /ROUND 1 \/ 3/.test(document.body.textContent) && !/ENTER 5-DIGIT/.test(document.body.textContent));
// 2) LEAVE clears the session
const leave = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'LEAVE');
act(() => leave.click());
check('LEAVE clears the stored session and emits leave_room', sessionStorage.getItem(KEY) === null && emitted.some((e) => e.ev === 'leave_room'));
// 3) failed rejoin clears the session
act(() => root.unmount());
sessionStorage.setItem(KEY, JSON.stringify({ code: '22222', sessionId: 'stale' }));
responders.rejoin_room = () => ({ success: false, message: 'Session expired.' });
root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
check('failed rejoin clears the stored session and stays on Home', sessionStorage.getItem(KEY) === null && /CREATE ROOM|JOIN GAME/.test(document.body.textContent));
// 4) create_room ack saves the session
responders.create_room = () => ({ success: true, roomId: '33333', code: '33333', sessionId: 'new-session' });
const createBtn = [...document.querySelectorAll('button')].find((b) => /CREATE PRIVATE ROOM/.test(b.textContent));
act(() => createBtn.click());
const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
check('create_room ack stores {code, sessionId} in sessionStorage', saved && saved.code === '33333' && saved.sessionId === 'new-session', JSON.stringify(saved));
// 5) socket reconnect (connect event) triggers rejoin again
const before = emitted.filter((e) => e.ev === 'rejoin_room').length;
responders.rejoin_room = () => ({ success: true, roomId: '33333', code: '33333', username: 'Mali' });
act(() => (handlers.connect || []).forEach((fn) => fn()));
check('socket "connect" (auto-reconnect) re-emits rejoin_room', emitted.filter((e) => e.ev === 'rejoin_room').length === before + 1);
out.textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
