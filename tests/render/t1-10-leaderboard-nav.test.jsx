// T1-10: LEADERBOARD nav item — crown icon + gold tint while not selected; FIND ROOM & LOBBY unchanged.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../../client/src/App.jsx';
const store = { game_username: 'Ann' }; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const html = renderToStaticMarkup(<App />);
const btn = (html.match(/<button[^>]*id="navLeaderboard"[^>]*>(?:(?!<\/button>).)*<\/button>/) || [''])[0];
check('LEADERBOARD nav button present', /LEADERBOARD/.test(btn), btn.slice(0, 120));
check('crown icon (Material Symbols, hidden from screen readers)', /<span[^>]*material-symbols-outlined[^>]*aria-hidden="true"[^>]*>crown<\/span>/.test(btn));
check('not selected: gold tint + gold border + bold', /bg-tertiary-fixed\/40/.test(btn) && /border-tertiary-container/.test(btn) && /font-bold/.test(btn));
const lobby = (html.match(/<button[^>]*>FIND ROOM &amp; LOBBY<\/button>/) || [''])[0];
check('FIND ROOM & LOBBY (selected) keeps its style, no icon', /bg-secondary-fixed/.test(lobby) && !/material-symbols/.test(lobby), lobby.slice(0, 120));
check('nav still hidden below md (mobile behavior unchanged)', /<nav class="hidden md:flex/.test(html));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
