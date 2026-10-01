// B3 PIN boxes in a real DOM (headless Chrome): input / keydown / paste events, focus, inputmode, join payload.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { act } from 'react-dom/test-utils';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
import App from '../../client/src/App.jsx';
import { emitted } from '../lib/socket-stub.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Mali');
const root = createRoot(document.getElementById('root'));
act(() => root.render(<App />));
const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('JOIN GAME'));
act(() => btn.click());
const boxes = () => [...document.querySelectorAll('input[aria-label^="Room code digit"]')];
const setterOf = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
const type = (el, value) => act(() => { el.focus(); setterOf.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
const key = (el, k) => act(() => { el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const paste = (el, text) => act(() => { const dt = new DataTransfer(); dt.setData('text', text); el.focus(); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
const vals = () => boxes().map((b) => b.value).join('');
const focusedIdx = () => boxes().indexOf(document.activeElement);

check('5 PIN boxes rendered (ROOM_PIN_LENGTH)', boxes().length === 5, String(boxes().length));
check('every box has inputmode="numeric"', boxes().every((b) => b.getAttribute('inputmode') === 'numeric'));
// continuous typing: always type into the currently focused box
type(boxes()[0], '8'); type(document.activeElement, '3'); type(document.activeElement, '9'); type(document.activeElement, '2'); type(document.activeElement, '1');
check('continuous typing fills 83921 without clicking boxes', vals() === '83921', vals());
check('focus ends on the last box', focusedIdx() === 4, String(focusedIdx()));
type(boxes()[2], 'x');
check('non-digit input ignored', vals() === '83921');
key(boxes()[4], 'Backspace');
check('Backspace on a filled box clears it', vals() === '8392', vals());
key(boxes()[4], 'Backspace');
check('Backspace on an empty box clears the previous box and moves focus back', vals() === '839' && focusedIdx() === 3, `${vals()} focus=${focusedIdx()}`);
paste(boxes()[2], '  5-4 3 2 1 9 ');
check('paste fills all boxes from the first box', vals() === '54321', vals());
// submit → join_room with the code
act(() => { document.querySelector('form button[type="submit"]').click(); });
const join = emitted.filter((e) => e.ev === 'join_room').pop();
check('submit emits join_room with the typed code', join && join.data.code === '54321', join && JSON.stringify(join.data));
out.textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
