import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeamGame from '../../client/src/gameModes/TeamGame.jsx';
// T1-01: the Team game shows which team draws and which team guesses, and the viewer's own role.
const results = []; const check = (n, c, d='') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = (over = {}) => ({ code: '1', host: 'A', gameMode: 'TEAM', maxPlayers: 8, totalRounds: 3, currentRound: 1, currentDrawer: 'A', status: 'PLAYING', currentWord: '',
  players: [{ username: 'A', score: 0, team: 'Red' }, { username: 'B', score: 0, team: 'Blue' }, { username: 'C', score: 0, team: 'Red' }],
  teams: { Red: { score: 0 }, Blue: { score: 0 } }, currentChallenge: 'NONE', wordLength: 3, ...over });
const render = (r, me) => renderToStaticMarkup(<TeamGame roomData={r} username={me} wordOptions={[]} />);
const banner = (h) => { const i = h.indexOf('id="teamRoles"'); return i < 0 ? '' : h.slice(i, h.indexOf('</div>', i)); };

const asB = render(room(), 'B');
check('PLAYING: banner says Red draws, Blue guesses', /TEAM RED DRAWS · .*TEAM BLUE GUESSES/.test(banner(asB)), banner(asB).replace(/<[^>]+>/g, ' ').slice(0, 120));
check('opposing player is told their team guesses', banner(asB).includes('Your team is guessing'));
check('rosters tag Red DRAWING and Blue GUESSING', asB.includes('TEAM RED · ✏️ DRAWING') && asB.includes('TEAM BLUE · 💬 GUESSING'));

const asC = render(room(), 'C');
check("drawer's teammate is told they can't guess", banner(asC).includes("Your team is drawing — you can&#x27;t guess this turn"));
check("drawer's teammate sees YOUR TEAM IS DRAWING instead of the guess label", asC.includes('YOUR TEAM IS DRAWING') && !asC.includes('TEAM GUESS WORD'));

const asA = render(room(), 'A');
check('drawer is told they draw for their team', banner(asA).includes('You are drawing for your team'));

const flipped = render(room({ currentDrawer: 'B' }), 'A');
check('Blue drawer → Blue draws, Red guesses', /TEAM BLUE DRAWS · .*TEAM RED GUESSES/.test(banner(flipped)) && banner(flipped).includes('Your team is guessing'));

const sel = render(room({ status: 'WORD_SELECTION' }), 'B');
check('WORD_SELECTION also shows the roles', banner(sel).includes('TEAM RED DRAWS'));
const over = render(room({ status: 'ROUND_OVER', currentWord: 'Cat' }), 'B');
check('ROUND_OVER: no role banner or roster tags', !over.includes('id="teamRoles"') && !over.includes('DRAWING') && !over.includes('GUESSING'));

console.log(results.join('\n')); console.log(`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
