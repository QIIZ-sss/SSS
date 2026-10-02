// T1-06: the chat never overflows — long words wrap, many messages scroll inside a bounded list (needs REAL_HEAD=1: Tailwind).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import ChatBox from '../../client/src/components/ChatBox.jsx';
import { GAME_RULES } from '../../shared/contract.js';
import { handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const host = document.getElementById('root'); host.style.width = '320px';
const root = createRoot(host);
act(() => root.render(<ChatBox username="Ann" isDrawer={false} roomStatus="PLAYING" />));
const run = () => {
  const fire = (m) => act(() => (handlers.chat_message || []).forEach((fn) => fn(m)));
  fire({ sender: 'Bo', text: 'x'.repeat(GAME_RULES.CHAT_MAX_LENGTH) });
  fire({ sender: 'System', text: 'y'.repeat(150), isSystem: true });
  for (let k = 0; k < 40; k++) fire({ sender: k % 2 ? 'Ann' : 'Bo', text: `message number ${k}` });
  setTimeout(() => {
    const list = document.getElementById('chatMessages');
    const rect = host.getBoundingClientRect();
    const wide = [...list.children].filter((el) => el.getBoundingClientRect().right > rect.right + 1);
    check('long unbroken words wrap inside the 320 px chat (no bubble wider than the box)', wide.length === 0 && list.scrollWidth <= list.clientWidth + 1,
      `scrollWidth ${list.scrollWidth} / client ${list.clientWidth}; wide bubbles ${wide.length}`);
    check('42 messages scroll inside a bounded list (height ≤ 360 px, scrollable)', list.clientHeight <= 360 && list.scrollHeight > list.clientHeight,
      `client ${list.clientHeight}, scroll ${list.scrollHeight}`);
    check('the list is scrolled to the newest message', Math.abs(list.scrollTop + list.clientHeight - list.scrollHeight) <= 2, `top ${list.scrollTop}`);
    check('the page itself does not grow sideways', document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const input = document.querySelector('input[type="text"]');
    check(`input limited to GAME_RULES.CHAT_MAX_LENGTH (${GAME_RULES.CHAT_MAX_LENGTH})`, input && input.maxLength === GAME_RULES.CHAT_MAX_LENGTH, input && String(input.maxLength));
    out.textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
  }, 800);
};
const waitTw = () => (window.tailwind ? setTimeout(run, 1500) : setTimeout(waitTw, 200));
waitTw();
