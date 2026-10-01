import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import TeamGame from '../../client/src/gameModes/TeamGame.jsx';
const results = []; const check = (n, c, d='') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const base = { code: '12345', host: 'A', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, totalRounds: 3, currentRound: 1, currentDrawer: 'A',
  players: [{ username: 'A', score: 0, team: 'Red' }, { username: 'B', score: 0, team: 'Blue' }], teams: { Red: { score: 0 }, Blue: { score: 0 } },
  currentChallenge: 'NONE', timeRemaining: 0, correctGuessersCount: 0, wordLength: 5 };
for (const [name, Comp, mode] of [['FFA', MultiplayerGame, 'MULTIPLAYER_FFA'], ['TEAM', TeamGame, 'TEAM']]) {
  const html = (status, me, word) => renderToStaticMarkup(<Comp roomData={{ ...base, gameMode: mode, status, currentWord: word }} username={me} wordOptions={[]} />);
  const g1 = html('ROUND_OVER', 'B', 'Apple');
  check(`${name} guesser sees answer in ROUND_OVER`, /The word was <strong>Apple<\/strong>/.test(g1) && /THE ANSWER WAS/.test(g1));
  const g2 = html('PLAYING', 'B', '');
  check(`${name} guesser sees only blanks in PLAYING`, !/Apple/.test(g2) && /_ _ _ _ _/.test(g2));
  const d1 = html('PLAYING', 'A', 'Apple');
  check(`${name} drawer sees word in PLAYING`, /Apple/.test(d1) && !/The word was/.test(d1));
  const d2 = html('WORD_SELECTION', 'A', '');
  check(`${name} drawer sees SELECTING WORD during WORD_SELECTION`, /SELECTING WORD/.test(d2));
}
console.log(results.join('\n')); console.log(`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
