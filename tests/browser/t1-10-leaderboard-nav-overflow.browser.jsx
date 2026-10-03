// T1-10: the LEADERBOARD nav item has a crown icon (real Material Symbols glyph) and a gold tint while not selected;
// navigation still works (LEADERBOARD → HALL OF FAME, back to FIND ROOM & LOBBY). Needs REAL_HEAD=1 (Tailwind + fonts).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../../client/src/App.jsx';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ success: true, leaderboard: [] }) }); // no API server here
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
localStorage.setItem('game_username', 'Ann');
const host = document.getElementById('root');
out.style.display = 'none';
const root = createRoot(host);
act(() => root.render(<App />));
const navBtn = (re) => [...document.querySelectorAll('header nav button')].find((b) => re.test(b.textContent));
const bg = (el) => getComputedStyle(el).backgroundColor;
const transparent = (c) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
const run = () => {
  const lb = navBtn(/LEADERBOARD/), lobby = navBtn(/FIND ROOM/);
  const icon = lb && lb.querySelector('.material-symbols-outlined');
  const r = icon && icon.getBoundingClientRect();
  check(`nav visible at ${innerWidth} px: LEADERBOARD and FIND ROOM & LOBBY buttons`, !!lb && !!lobby && lb.getBoundingClientRect().width > 0);
  check('LEADERBOARD has a crown icon drawn as a glyph (not the word "crown")', icon && icon.textContent === 'crown' && r.width > 0 && r.width <= 28,
    r ? `icon ${Math.round(r.width)}×${Math.round(r.height)} px` : 'no icon');
  check('LEADERBOARD (not selected) has a gold tint and border; LOBBY (selected) unchanged', lb && !transparent(bg(lb)) && bg(lb) !== bg(lobby)
    && getComputedStyle(lb).borderTopColor !== 'rgba(0, 0, 0, 0)', lb && `${bg(lb)} / border ${getComputedStyle(lb).borderTopColor}`);
  check('header has no horizontal overflow', document.querySelector('header').scrollWidth <= document.querySelector('header').clientWidth + 1);
  act(() => lb.click());
  setTimeout(() => {
    const lb2 = navBtn(/LEADERBOARD/);
    check('click LEADERBOARD → HALL OF FAME shown, CREATE PRIVATE ROOM gone', /HALL OF FAME/.test(document.body.textContent) && !document.getElementById('createRoomButton'));
    check('LEADERBOARD selected style when active, crown kept', /bg-secondary-fixed/.test(lb2.className) && !!lb2.querySelector('.material-symbols-outlined'));
    act(() => navBtn(/FIND ROOM/).click());
    setTimeout(() => {
      check('click FIND ROOM & LOBBY → back to the lobby', !!document.getElementById('createRoomButton') && !/HALL OF FAME/.test(document.body.textContent));
      out.style.display = '';
      out.textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
    }, 300);
  }, 300);
};
const waitTw = () => (window.tailwind ? setTimeout(() => document.fonts.ready.then(() => setTimeout(run, 500)), 1500) : setTimeout(waitTw, 200));
waitTw();
