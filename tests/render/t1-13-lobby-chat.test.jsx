// T1-13: the lobby shows a LOBBY CHAT box (the existing ChatBox) under the roster in FFA and Team, not in Solo; the input
// keeps the shared length limit; the in-game ChatBox is unchanged (GUESS FEED).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import ChatBox from '../../client/src/components/ChatBox.jsx';
import { GAME_RULES } from '../../shared/contract.js';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const players = [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: true, team: 'Blue' }];
const room = (gameMode, ps = players) => ({ code: '12345', name: 'R', host: 'Ann', gameMode, maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null,
  status: 'LOBBY', teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: ps });
for (const [label, r, me] of [['FFA host', room('MULTIPLAYER_FFA'), 'Ann'], ['FFA guest', room('MULTIPLAYER_FFA'), 'Bob'], ['Team', room('TEAM'), 'Bob']]) {
  const html = renderToStaticMarkup(<RoomLobby roomData={r} username={me} />);
  const chatAt = html.indexOf('id="lobbyChat"'), rosterAt = html.indexOf('PLAYER ROSTER');
  check(`${label}: LOBBY CHAT shown under the PLAYER ROSTER`, chatAt > 0 && rosterAt > 0 && chatAt > rosterAt && /LOBBY CHAT/.test(html));
  check(`${label}: chat input limited to GAME_RULES.CHAT_MAX_LENGTH, "TYPE A MESSAGE..."`, html.includes(`maxLength="${GAME_RULES.CHAT_MAX_LENGTH}"`) && html.includes('TYPE A MESSAGE...'));
}
const solo = renderToStaticMarkup(<RoomLobby roomData={room('SOLO_AI', [players[0]])} username="Ann" />);
check('Solo: no lobby chat', !solo.includes('lobbyChat') && !/LOBBY CHAT/.test(solo) && !solo.includes('chatMessages'));
const game = renderToStaticMarkup(<ChatBox username="Ann" isDrawer={false} roomStatus="PLAYING" />);
check('in-game ChatBox unchanged (GUESS FEED, full height)', /GUESS FEED/.test(game) && game.includes('min-h-[460px]') && !game.includes('lobbyChat'));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
