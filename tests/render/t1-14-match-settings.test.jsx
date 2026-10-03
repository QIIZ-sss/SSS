// T1-14: one match-settings view in the lobby (no MODIFIERS / SETTINGS tabs): game mode, round timer, total rounds,
// word difficulty, max players (not in Solo) and the mini-challenge cards (only place); Solo refusal explained in the UI;
// guests read-only; values shown from roomData.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RoomLobby from '../../client/src/components/RoomLobby.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const players = [{ username: 'Ann', score: 0, isReady: false, team: 'Red' }, { username: 'Bob', score: 0, isReady: true, team: 'Blue' }];
const room = { code: '12345', name: 'R', host: 'Ann', gameMode: 'MULTIPLAYER_FFA', maxPlayers: 12, roundTime: 90, totalRounds: 5, wordDifficulty: 'HARD',
  status: 'LOBBY', enabledChallenges: ['NONE', 'DONT_LIFT_PEN'], teams: { Red: { score: 0 }, Blue: { score: 0 } }, players };
const html = (r, me = 'Ann') => renderToStaticMarkup(<RoomLobby roomData={r} username={me} />);
const btn = (h, label) => (h.match(new RegExp(`<button[^>]*>(?:(?:(?!</button>).)*?>)?${label}</(?:span|button)>`)) || [''])[0];
const CARDS = ['Standard Drawing', 'Colour Fix', 'Don&#x27;t Lift Pen', 'Geometric Shapes Only'];

const host = html(room);
check('no tabs: MODIFIERS & TWISTS / SETTINGS tab buttons gone', !/MODIFIERS &amp; TWISTS/.test(host) && !/>SETTINGS ⚙️</.test(host) && !/>SETTINGS </.test(host));
const order = ['MATCH SETTINGS', '1. GAME MODE', '2. ROUND TIMER', '3. TOTAL ROUNDS', '4. WORD DIFFICULTY', '5. MAX PLAYERS', 'id="miniChallengeHeading"'].map((t) => host.indexOf(t));
check('one view holds every setting, in order: game mode, timer, rounds, difficulty, max players, mini-challenges',
  order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), order.join(','));
const counts = CARDS.map((c) => (host.match(new RegExp(c, 'g')) || []).length);
check('mini-challenges appear in ONE place (each name once, no "ENABLED MINI-CHALLENGES" list)', counts.every((n) => n === 1) && !/ENABLED MINI-CHALLENGES/.test(host), counts.join(','));
check('values from roomData shown: 90s, 5 rounds, HARD, 12 players, 2 / 4 ACTIVE',
  /bg-timer-red[^"]*"[^>]*>90s</.test(host) && /bg-secondary-fixed[^"]*"[^>]*>5</.test(host) && /aria-pressed="true"[^>]*>HARD</.test(host)
    && /bg-tertiary-fixed[^"]*"[^>]*>12</.test(host) && /2 \/ 4 ACTIVE/.test(host));
check('host: controls enabled (timer / rounds / difficulty / max players)', !/disabled=""[^>]*>90s</.test(host) && !/disabled=""[^>]*>HARD</.test(host) && /HOST CONTROLS ACTIVE/.test(host));
check('host with another player: SOLO VS AI disabled + visible reason (role=status)',
  /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*SOLO VS AI/.test(host)
    && /<p role="status"[^>]*id="soloBlockedReason">(?:(?!<\/p>).)*SOLO VS AI unavailable — Solo vs AI is single-player: everyone else must leave the room first\.<\/p>/.test(host));
const alone = html({ ...room, players: [players[0]] });
check('host alone: SOLO VS AI enabled, no reason', !/disabled=""[^>]*>(?:(?!<\/button>).)*SOLO VS AI/.test(alone) && !alone.includes('soloBlockedReason'));
const solo = html({ ...room, gameMode: 'SOLO_AI', players: [players[0]] });
check('Solo: MAX PLAYERS hidden; timer / rounds / difficulty / mini-challenges kept',
  !/MAX PLAYERS/.test(solo) && ['2. ROUND TIMER', '3. TOTAL ROUNDS', '4. WORD DIFFICULTY', 'id="miniChallengeHeading"'].every((t) => solo.includes(t)));
check('Solo summary points to MATCH SETTINGS', solo.includes('Change these in MATCH SETTINGS.'));
const guest = html(room, 'Bob');
const settingBtns = ['90s', '5', 'HARD', '12', 'FREE-FOR-ALL'].map((l) => btn(guest, l));
check('guest: read-only (every setting button disabled, READ-ONLY badge, no host hint, no Solo reason)',
  settingBtns.every((b) => /disabled=""/.test(b)) && /READ-ONLY GUEST VIEW/.test(guest) && !guest.includes('turn it ON or OFF') && !guest.includes('soloBlockedReason'),
  settingBtns.map((b) => (/disabled=""/.test(b) ? 'd' : b ? 'E' : '?')).join(''));
check('guest: mini-challenge cards not clickable (no pointer cursor)', !/cursor-pointer/.test(guest.slice(guest.indexOf('miniChallengeHeading'))));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
