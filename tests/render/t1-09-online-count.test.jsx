// T1-09: the home screen shows no fake online count (there is no real one); the ticker bar itself stays.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../../client/src/App.jsx';
const store = { game_username: 'Ann' }; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const home = renderToStaticMarkup(<App />);
check('home (logged in) is rendered: ticker bar and CREATE PRIVATE ROOM present', /ARCADE LOBBY NETWORK/.test(home) && /id="createRoomButton"/.test(home));
check('no "PLAYERS ONLINE" text', !/PLAYERS ONLINE/i.test(home), (home.match(/.{0,40}ONLINE.{0,20}/i) || [''])[0]);
check('no hardcoded 1,420 count', !/1,?420/.test(home));
console.log(results.join('\n')); console.log(`\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
