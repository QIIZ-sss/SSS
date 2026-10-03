// T1-12: the lobby Mini-Challenge section has a clear heading and a one-line explanation (host, guest, Solo);
// the toggle cards are unchanged (4 cards, ENABLED / DISABLED, ACTIVE count, host hint).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = { code: '12345', name: 'R', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null, status: 'LOBBY',
  enabledChallenges: ['NONE', 'COLOUR_FIX'], teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: true, team: 'Blue' }] };
const help = 'Each turn, one enabled challenge is picked at random and adds a drawing rule for the drawer.';
for (const [who, html] of [['host', renderToStaticMarkup(<RoomLobby roomData={room} username="Ann" />)],
  ['guest', renderToStaticMarkup(<RoomLobby roomData={room} username="Bob" />)],
  ['Solo', renderToStaticMarkup(<RoomLobby roomData={{ ...room, gameMode: 'SOLO_AI', players: [room.players[0]] }} username="Ann" />)]]) {
  check(`${who}: heading is an <h3> "MINI-CHALLENGES"`, /<h3[^>]*id="miniChallengeHeading"[^>]*>(?:(?!<\/h3>).)*MINI-CHALLENGES<\/h3>/.test(html));
  check(`${who}: one-line explanation right under the heading`, html.includes(`id="miniChallengeHelp">${help}</p>`));
  const cards = (html.match(/<h4[^>]*>(Standard Drawing|Colour Fix|Don&#x27;t Lift Pen|Geometric Shapes Only)<\/h4>/g) || []).length;
  check(`${who}: toggle cards unchanged (4 cards, 2 ENABLED / 2 DISABLED, 2 / 4 ACTIVE)`, cards === 4 && /2 \/ 4 ACTIVE/.test(html)
    && (html.match(/>ENABLED</g) || []).length >= 2 && (html.match(/>DISABLED</g) || []).length >= 2, `cards ${cards}`);
  if (who === 'host') check('host: "click a card to turn it ON or OFF" hint kept', html.includes('Host: Click any mini-challenge card below to turn it ON or OFF!'));
  if (who === 'guest') check('guest: no host hint (cards not clickable)', !html.includes('turn it ON or OFF'));
}
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
