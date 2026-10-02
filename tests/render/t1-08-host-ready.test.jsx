// T1-08: the host sees START (no READY button, badge HOST); a guest sees a READY button showing its state and no START.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = (bobReady) => ({ code: '12345', name: 'R', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null,
  status: 'LOBBY', teams: { Red: { score: 0 }, Blue: { score: 0 } },
  players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: bobReady, team: 'Blue' }] });
const host = renderToStaticMarkup(<RoomLobby roomData={room(false)} username="Ann" />);
check('host: no READY button', !host.includes('id="readyButton"') && !host.includes('TOGGLE READY'));
check('host: START GAME shown (disabled while Bob is not ready, with the reason)', host.includes('START GAME') && /disabled=""[^>]*>(?:(?!<\/button>).)*START GAME/.test(host) && host.includes('Waiting for: Bob'));
check('host: roster badge says HOST, not WAITING', />HOST</.test(host) && (host.match(/>WAITING</g) || []).length === 1, String((host.match(/>WAITING</g) || []).length));
const hostReady = renderToStaticMarkup(<RoomLobby roomData={room(true)} username="Ann" />);
check('host: START enabled once every guest is ready', hostReady.includes('START GAME') && !/disabled=""[^>]*>(?:(?!<\/button>).)*START GAME/.test(hostReady));
const guest = renderToStaticMarkup(<RoomLobby roomData={room(false)} username="Bob" />);
check("guest: I'M READY button, no START", guest.includes('id="readyButton"') && guest.includes('I&#x27;M READY') && !guest.includes('START GAME'));
check('guest: hint to press READY', guest.includes('Press READY so the host can start'));
const guestReady = renderToStaticMarkup(<RoomLobby roomData={room(true)} username="Bob" />);
check('ready guest: button shows the ready state (aria-pressed) and the wait message names the host', guestReady.includes('aria-pressed="true"') && guestReady.includes('READY — TAP TO CANCEL')
  && guestReady.includes('Waiting for Ann to start the game'));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
