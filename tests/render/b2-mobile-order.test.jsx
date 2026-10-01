import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import TeamGame from '../../client/src/gameModes/TeamGame.jsx';
const results = []; const check = (n, c, d='') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = { code: '1', host: 'A', maxPlayers: 8, totalRounds: 3, currentRound: 1, currentDrawer: 'A', status: 'PLAYING', currentWord: '',
  players: [{ username: 'A', score: 0, team: 'Red' }, { username: 'B', score: 0, team: 'Blue' }], teams: { Red: { score: 0 }, Blue: { score: 0 } }, currentChallenge: 'NONE', wordLength: 3 };
for (const [n, C, mode] of [['FFA', MultiplayerGame, 'MULTIPLAYER_FFA'], ['TEAM', TeamGame, 'TEAM']]) {
  const h = renderToStaticMarkup(<C roomData={{ ...room, gameMode: mode }} username="B" wordOptions={[]} />);
  const iCanvas = h.indexOf('order-1 lg:order-none'), iChat = h.indexOf('order-2 lg:order-none'), iStand = h.indexOf('order-3 lg:order-none');
  check(`${n} mobile order classes: canvas=1, chat=2, standings=3 (desktop unchanged)`, iCanvas > 0 && iChat > 0 && iStand > 0);
  check(`${n} canvas column wraps the <canvas>`, h.indexOf('<canvas', iCanvas) > iCanvas && h.indexOf('<canvas', iCanvas) < iChat);
}
console.log(results.join('\n')); console.log(`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
