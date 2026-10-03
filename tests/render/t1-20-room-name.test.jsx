// T1-20: Create Room has an optional ROOM NAME input limited to GAME_RULES.ROOM_NAME_MAX_LENGTH; the lobby header shows
// the room name; the server's public room (host GAME_RULES.PUBLIC_ROOM_HOST) shows PUBLIC ROOM instead of "HOST: System".
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../../client/src/App.jsx';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
import { GAME_RULES } from '../../shared/contract.js';
const store = { game_username: 'Ann' }; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const home = renderToStaticMarkup(<App />);
const input = (home.match(/<input[^>]*id="roomNameInput"[^>]*>/) || [''])[0];
check('Create Room: ROOM NAME (OPTIONAL) label + input', /<label[^>]*for="roomNameInput"[^>]*>ROOM NAME \(OPTIONAL\)<\/label>/.test(home) && !!input);
check(`input maxLength = GAME_RULES.ROOM_NAME_MAX_LENGTH (${GAME_RULES.ROOM_NAME_MAX_LENGTH}), not required`, input.includes(`maxLength="${GAME_RULES.ROOM_NAME_MAX_LENGTH}"`) && !/required/.test(input), input);
check('placeholder shows the default name', input.includes(`placeholder="Ann&#x27;s Room"`), input);
const base = { code: '12345', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null, status: 'LOBBY',
  teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }] };
const own = renderToStaticMarkup(<RoomLobby roomData={{ ...base, name: 'Art Club' }} username="Ann" />);
check('lobby header shows the room name and the host', /id="roomNameDisplay">Art Club</.test(own) && own.includes('HOST: Ann 👑') && !own.includes('publicRoomLabel'));
const seed = renderToStaticMarkup(<RoomLobby roomData={{ ...base, code: '83921', name: 'Public Neo Lounge 🎨', host: GAME_RULES.PUBLIC_ROOM_HOST }} username="Ann" />);
check('seed room: PUBLIC ROOM label, no "HOST: System"', /id="publicRoomLabel">PUBLIC ROOM</.test(seed) && !/HOST: System/.test(seed) && /Public Neo Lounge/.test(seed));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
