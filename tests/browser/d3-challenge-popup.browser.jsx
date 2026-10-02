// D3 challenge popup: shown to every player at the start of a turn; closes on GOT IT or after UI.CHALLENGE_POPUP_MS;
// never covers the drawer's drawing time; the DONT_LIFT_PEN violation modal replaces alert() and never blocks permanently.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import Canvas from '../../client/src/components/Canvas.jsx';
import { UI } from '../../shared/contract.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const alerts = []; window.alert = (m) => alerts.push(m);
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAY = UI.CHALLENGE_POPUP_MS;
const base = { code: '1', host: 'A', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, totalRounds: 3, currentRound: 1, currentDrawer: 'A', status: 'WORD_SELECTION',
  currentWord: '', wordLength: 0, currentChallenge: 'DONT_LIFT_PEN', forcedColor: null, teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'A', score: 0, team: 'Red' }, { username: 'B', score: 0, team: 'Red' }] };
const host = document.getElementById('root');
let root = createRoot(host);
const dialog = () => document.querySelector('[role="dialog"]');
const render = (room, me, words = []) => act(() => root.render(<MultiplayerGame roomData={room} username={me} wordOptions={words} />));
const fresh = () => { act(() => root.unmount()); root = createRoot(host); };
const press = () => act(() => [...dialog().querySelectorAll('button')].find((b) => /GOT IT|OK/.test(b.textContent)).click());

(async () => {
  check(`popup delay comes from shared/contract.js UI.CHALLENGE_POPUP_MS (${DELAY} ms)`, typeof DELAY === 'number' && DELAY > 0);

  // 1) guesser: shown at turn start, GOT IT closes immediately
  render(base, 'B');
  check('shown to a guesser at the start of the turn', !!dialog() && /CHALLENGE: Don't Lift Pen/.test(dialog().textContent));
  check('DONT_LIFT_PEN popup states the pen must not be lifted', /Do NOT lift your pen/.test(dialog().textContent));
  press();
  check('GOT IT closes it immediately', !dialog());

  // 2) auto-close after the fixed delay; the timer is not restarted when WORD_SELECTION becomes PLAYING
  fresh();
  const t2 = { ...base, currentRound: 2 };
  render(t2, 'B');
  await wait(DELAY - 1200);
  render({ ...t2, status: 'PLAYING', wordLength: 5 }, 'B');
  check('still open shortly after the turn moves to PLAYING (guesser, before the delay)', !!dialog());
  await wait(1500);
  check(`auto-closed ~${DELAY} ms after the turn started (not left open until the turn ends)`, !dialog());

  // 3) drawer: seen during WORD_SELECTION, closes the moment drawing starts
  fresh();
  const t3 = { ...base, currentRound: 3, currentChallenge: 'COLOUR_FIX', forcedColor: '#EF4444' };
  render(t3, 'A', ['Helicopter', 'Eiffel Tower', 'Basketball']);
  check('shown to the drawer during WORD_SELECTION, with the locked colour', !!dialog() && /Colour Fix/.test(dialog().textContent) && /LOCKED COLOR/.test(dialog().textContent));
  check('popup contains no secret (no candidate words)', !/Helicopter|Eiffel Tower|Basketball/.test(dialog().textContent));
  render({ ...t3, status: 'PLAYING', currentWord: 'Helicopter', wordLength: 10 }, 'A');
  check('closes for the drawer as soon as PLAYING starts (no drawing time used)', !dialog());

  // 4) turn that starts directly in PLAYING (Solo AI): shown, closes on its own within the delay
  fresh();
  render({ ...base, currentRound: 4, status: 'PLAYING', currentWord: 'Sun', wordLength: 3 }, 'A');
  check('turn starting in PLAYING (Solo) still shows the popup', !!dialog());
  await wait(DELAY + 300);
  check(`…and it closes by itself after ${DELAY} ms`, !dialog());

  // 5) nothing for NONE / after the turn
  fresh();
  render({ ...base, currentRound: 5, currentChallenge: 'NONE' }, 'B');
  check('no popup when the challenge is NONE', !dialog());
  render({ ...base, currentRound: 6, status: 'ROUND_OVER', currentWord: 'Apple' }, 'B');
  check('no popup outside WORD_SELECTION / PLAYING', !dialog());

  // 6) DONT_LIFT_PEN violation modal: dismissible, auto-closes, no alert()
  const host2 = document.createElement('div'); host2.style.width = '640px'; document.body.appendChild(host2);
  const root2 = createRoot(host2);
  act(() => root2.render(<Canvas isDrawer={true} challenge="DONT_LIFT_PEN" />));
  const cs = host2.querySelectorAll('canvas'); const ghost = cs[cs.length - 1];
  const r = ghost.getBoundingClientRect();
  const ptr = (type, x, y) => act(() => ghost.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, clientX: r.left + x, clientY: r.top + y })));
  const violate = () => { ptr('pointerdown', 200, 200); };
  ptr('pointerdown', 100, 100); ptr('pointermove', 150, 120); ptr('pointerup', 150, 120);
  violate();
  check("lifting then drawing again shows the DON'T LIFT PEN modal", !!dialog() && /DON'T LIFT PEN/.test(dialog().textContent));
  check('no window.alert() was used', alerts.length === 0, alerts.join('|'));
  press();
  check('OK closes the violation modal', !dialog());
  violate();
  check('violation modal shown again on the next attempt', !!dialog());
  await wait(DELAY + 300);
  check(`violation modal also closes by itself after ${DELAY} ms (never blocks permanently)`, !dialog());
  check('board stays locked by the rule (banner), not by a modal', /DON'T LIFT PEN RULE LOCKED/.test(host2.textContent));

  document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
})();
