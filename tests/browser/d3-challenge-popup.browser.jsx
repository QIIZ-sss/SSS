// D3 challenge popup: shown at the start of each turn, closed by GOT IT or when the turn ends; DONT_LIFT_PEN modal replaces alert().
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import Canvas from '../../client/src/components/Canvas.jsx';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const alerts = []; window.alert = (m) => alerts.push(m);
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const base = { code: '1', host: 'A', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, totalRounds: 3, currentRound: 1, currentDrawer: 'A', status: 'WORD_SELECTION',
  currentWord: '', wordLength: 0, currentChallenge: 'DONT_LIFT_PEN', forcedColor: null, teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'A', score: 0, team: 'Red' }, { username: 'B', score: 0, team: 'Red' }] };
const host = document.getElementById('root');
const root = createRoot(host);
const dialog = () => document.querySelector('[role="dialog"]');
const render = (room, me, words = []) => act(() => root.render(<MultiplayerGame roomData={room} username={me} wordOptions={words} />));
const gotIt = () => act(() => [...dialog().querySelectorAll('button')].find((b) => /GOT IT|OK/.test(b.textContent)).click());

render(base, 'B');
check('popup shown at the start of the turn (WORD_SELECTION) for a guesser', !!dialog() && /CHALLENGE: Don't Lift Pen/.test(dialog().textContent));
check('DONT_LIFT_PEN popup states the pen must not be lifted', /Do NOT lift your pen/.test(dialog().textContent));
gotIt();
check('GOT IT closes the popup', !dialog());
render({ ...base, status: 'PLAYING', wordLength: 5 }, 'B');
check('stays closed for the same turn once PLAYING starts', !dialog());
render({ ...base, status: 'ROUND_OVER', currentWord: 'Apple' }, 'B');
check('no popup after the turn is over', !dialog());
render({ ...base, currentRound: 1, currentDrawer: 'B' }, 'A');
check('popup shown again for the next turn', !!dialog());
render({ ...base, currentRound: 1, currentDrawer: 'B', status: 'ROUND_OVER' }, 'A');
check('popup not dismissed by the player closes automatically when the turn ends', !dialog());
render({ ...base, currentRound: 2, currentChallenge: 'NONE' }, 'B');
check('no popup when the challenge is NONE', !dialog());
render({ ...base, currentRound: 2, currentDrawer: 'A', currentChallenge: 'COLOUR_FIX', forcedColor: '#EF4444' }, 'A', ['Helicopter', 'Eiffel Tower', 'Basketball']);
check('drawer sees the popup before drawing (WORD_SELECTION)', !!dialog() && /Colour Fix/.test(dialog().textContent) && /LOCKED COLOR/.test(dialog().textContent));
check('popup contains no secret (no candidate words)', !/Helicopter|Eiffel Tower|Basketball/.test(dialog().textContent));
gotIt();
// DONT_LIFT_PEN violation: modal instead of alert()
const host2 = document.createElement('div'); host2.style.width = '640px'; document.body.appendChild(host2);
const root2 = createRoot(host2);
act(() => root2.render(<Canvas isDrawer={true} challenge="DONT_LIFT_PEN" />));
const ghost = host2.querySelectorAll('canvas')[host2.querySelectorAll('canvas').length - 1];
const r = ghost.getBoundingClientRect();
const ptr = (type, x, y) => act(() => ghost.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, clientX: r.left + x, clientY: r.top + y })));
ptr('pointerdown', 100, 100); ptr('pointermove', 150, 120); ptr('pointerup', 150, 120);
ptr('pointerdown', 200, 200);
check('lifting then drawing again shows the DON\'T LIFT PEN modal', !!dialog() && /DON'T LIFT PEN/.test(dialog().textContent) && /locked/.test(dialog().textContent));
check('no window.alert() was used', alerts.length === 0, alerts.join('|'));
gotIt();
check('OK closes the violation modal (board stays locked)', !dialog() && /DON'T LIFT PEN RULE LOCKED/.test(host2.textContent));
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
