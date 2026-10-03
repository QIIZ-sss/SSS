// Solo vs AI lobby: multiplayer-only controls hidden (roster, Ready, max players), Solo start control, Solo settings kept;
// in a multiplayer room with other players the SOLO VS AI mode button is disabled with the reason.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const base = { code: '12345', name: 'R', host: 'Ann', maxPlayers: 8, roundTime: 60, totalRounds: 3, wordDifficulty: null, status: 'LOBBY',
  teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }] };
// T1-14: one match-settings view (no tabs) — every setting is in the first render; `tab` is kept for the old call sites
const render = (room, me = 'Ann', tab) => renderToStaticMarkup(<RoomLobby roomData={room} username={me} />);
const solo = { ...base, gameMode: 'SOLO_AI' };
const soloMain = render(solo), soloSettings = render(solo, 'Ann', 'SETTINGS');
check('Solo: no PLAYER ROSTER', !soloMain.includes('PLAYER ROSTER'));
check('Solo: no READY button', !soloMain.includes('id="readyButton"') && !soloMain.includes('TOGGLE READY'));
check('Solo: no MAX PLAYERS setting', soloSettings.includes('SETTINGS') && !soloSettings.includes('MAX PLAYERS'));
check('Solo: START SOLO button, enabled', /<button[^>]*>(?:(?!<\/button>).)*START SOLO/.test(soloMain) && !/disabled=""[^>]*>(?:(?!<\/button>).)*START SOLO/.test(soloMain));
check('Solo: mini-challenges still offered', soloMain.includes('id="miniChallengeHeading"'));
check('Solo: rounds / timer / difficulty settings kept', /ROUND/i.test(soloSettings) && /MIXED/.test(soloSettings) && /HARD/.test(soloSettings));
// T1-19: no room code to share, no host line, a summary of the solo setup
check('Solo (T1-19): SOLO PRACTICE badge instead of a shareable room code', soloMain.includes('id="soloBadge"') && !soloMain.includes('roomCodeDisplay') && !soloMain.includes('Copy Room ID'));
check('Solo (T1-19): no "HOST:" line, neutral modifier hint', !soloMain.includes('HOST: Ann') && soloMain.includes('Click a mini-challenge card') && !soloMain.includes('Host: Click'));
check('Solo (T1-19): setup summary (rounds, time, difficulty, challenges)', /id="soloSummary"/.test(soloMain) && /<strong>3<\/strong> rounds/.test(soloMain)
  && /<strong>60s<\/strong> per drawing/.test(soloMain) && /<strong>MIXED<\/strong>/.test(soloMain));
const ffa = { ...base, gameMode: 'MULTIPLAYER_FFA', players: [...base.players, { username: 'Bob', score: 0, isReady: true, team: 'Blue' }] };
const ffaMain = render(ffa), ffaSettings = render(ffa, 'Ann', 'SETTINGS');
check('FFA (T1-19 unchanged): room code + copy button and HOST line shown', ffaMain.includes('roomCodeDisplay') && ffaMain.includes('Copy Room ID') && ffaMain.includes('HOST: Ann'));
check('FFA host: roster and START GAME shown (no READY button for the host since T1-08)', ffaMain.includes('PLAYER ROSTER') && !ffaMain.includes('id="readyButton"') && ffaMain.includes('START GAME'));
check('FFA: MAX PLAYERS setting shown', ffaSettings.includes('MAX PLAYERS'));
check('FFA with another player: SOLO VS AI button disabled with the reason', /<button[^>]*disabled=""[^>]*title="Solo vs AI is single-player[^"]*"[^>]*>(?:(?!<\/button>).)*SOLO VS AI/.test(ffaSettings)
  && ffaSettings.includes('id="soloBlockedReason"'));
const alone = render({ ...base, gameMode: 'MULTIPLAYER_FFA' }, 'Ann', 'SETTINGS');
check('FFA host alone: SOLO VS AI button enabled, no reason shown', !/disabled=""[^>]*>(?:(?!<\/button>).)*SOLO VS AI/.test(alone) && !alone.includes('soloBlockedReason'));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
