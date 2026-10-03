// T1-13: lobby chat in the real App (socket stub, real Tailwind): messages render as text (never HTML), the list scrolls
// inside a fixed height, sending uses the existing send_chat, the history survives LOBBY → game → LOBBY, and a new room
// starts empty. Needs REAL_HEAD=1 (Tailwind) for the height / scroll checks.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
import { handlers, emitted, responders } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const fire = (ev, data) => act(() => (handlers[ev] || []).forEach((fn) => fn(data)));
const players = ['Ann', 'Bob', 'Chai'].map((u, i) => ({ username: u, avatar: '🐶', score: 0, isReady: i > 0, team: i % 2 ? 'Blue' : 'Red' }));
const room = (code, status, extra = {}) => ({ id: code, code, name: 'R', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3,
  currentRound: 1, currentDrawer: 'Bob', status, currentWord: '', wordLength: 5, correctGuessersCount: 0, currentChallenge: 'NONE', forcedColor: null,
  timeRemaining: 60, enabledChallenges: ['NONE'], miniChallengeEnabled: true, wordDifficulty: null, teams: { Red: { score: 0 }, Blue: { score: 0 } }, players, ...extra });
localStorage.setItem('game_username', 'Ann');
out.style.display = 'none';
const root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
const enterRoom = (code) => {
  responders.create_room = () => ({ success: true, roomId: code, code, sessionId: 's' + code });
  act(() => document.getElementById('createRoomButton').click());
  fire('room_data', room(code, 'LOBBY'));
};
const list = () => document.getElementById('chatMessages');
const run = () => {
  enterRoom('11111');
  const chat = document.getElementById('lobbyChat');
  check('lobby (FFA) shows LOBBY CHAT', !!chat && /LOBBY CHAT/.test(chat.textContent));
  fire('chat_message', { sender: 'Bob', text: 'hello lobby' });
  const html = '<img src=x onerror="window.__xss=1"><b>bold</b>';
  fire('chat_message', { sender: 'Chai', text: html });
  check('messages shown with sender', /Bob:\s*hello lobby/.test(list().textContent));
  check('HTML in a message is shown as text, never rendered', list().textContent.includes(html) && !list().querySelector('img, b') && !window.__xss);
  const input = chat.querySelector('input');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  act(() => { set.call(input, 'gg everyone'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  act(() => chat.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  const sent = emitted.filter((e) => e.ev === 'send_chat').pop();
  check('send uses the existing send_chat { text }', sent && sent.data.text === 'gg everyone', sent && JSON.stringify(sent.data));
  setTimeout(() => burst(chat), 800); // the Tailwind CDN builds CSS for newly seen classes asynchronously
};
const burst = (chat) => {
  const h0 = chat.getBoundingClientRect().height;
  for (let i = 0; i < 40; i++) fire('chat_message', { sender: 'Bob', text: `message ${i} ` + 'long text '.repeat(i % 4) });
  const h1 = chat.getBoundingClientRect().height;
  check('40 messages: the chat box keeps its height, the list scrolls inside it', Math.abs(h1 - h0) <= 2 && list().scrollHeight > list().clientHeight + 100
    && list().clientHeight <= 220, `box ${Math.round(h0)}→${Math.round(h1)} px, list ${list().clientHeight}/${list().scrollHeight} px`);
  setTimeout(() => {
    check('list is scrolled to the newest message', list().scrollTop + list().clientHeight >= list().scrollHeight - 2, `${list().scrollTop}+${list().clientHeight}/${list().scrollHeight}`);
    fire('room_data', room('11111', 'PLAYING'));
    check('game starts: lobby chat history is kept in the game chat (GUESS FEED)', !document.getElementById('lobbyChat') && /GUESS FEED/.test(document.body.textContent)
      && /hello lobby/.test(list().textContent) && /message 39/.test(list().textContent));
    fire('chat_message', { sender: 'Chai', text: 'during the game' });
    fire('room_data', room('11111', 'LOBBY'));
    check('back in the lobby: lobby + game messages still there', !!document.getElementById('lobbyChat') && /hello lobby/.test(list().textContent) && /during the game/.test(list().textContent));
    const leave = [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'LEAVE');
    act(() => leave.click());
    enterRoom('22222');
    check('another room starts with an empty chat', !!document.getElementById('lobbyChat') && list().children.length === 0, `${list().children.length} messages`);
    out.style.display = '';
    out.textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
  }, 300);
};
const waitTw = () => (window.tailwind ? setTimeout(run, 1500) : setTimeout(waitTw, 200));
waitTw();
