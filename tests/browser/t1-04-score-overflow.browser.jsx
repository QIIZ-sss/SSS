// T1-04: big scores and long names never push the score out of its card (FFA leaderboard, Team rosters, Team header);
// the FFA in-game leaderboard is ranked by score. Needs REAL_HEAD=1 (Tailwind).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import MultiplayerGame from '../../client/src/gameModes/MultiplayerGame.jsx';
import TeamGame from '../../client/src/gameModes/TeamGame.jsx';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const host = document.getElementById('root');
const players = [
  { username: 'Cy', score: 1500, team: 'Red', avatar: '🐼' },
  { username: 'Bartholomew_TheGreat_Longname', score: 9876543, team: 'Blue', avatar: '🦊' },
  { username: 'Ann', score: 123456, team: 'Red', avatar: '🐶' },
  { username: 'Dee', score: 0, team: 'Blue', avatar: '🚀' },
];
const room = (mode) => ({ code: '1', host: 'Ann', gameMode: mode, maxPlayers: 8, totalRounds: 10, currentRound: 10, currentDrawer: 'Dee', status: 'PLAYING', currentWord: '',
  wordLength: 5, timeRemaining: 60, currentChallenge: 'NONE', forcedColor: null, teams: { Red: { score: 12345678 }, Blue: { score: 9999999 } }, players });
// every element containing a score must stay inside its row card
const escaped = (rowSel) => [...host.querySelectorAll(rowSel)].filter((row) => {
  const r = row.getBoundingClientRect();
  return [...row.querySelectorAll('*')].some((el) => { const e = el.getBoundingClientRect(); return e.width && (e.right > r.right + 1 || e.left < r.left - 1); });
});
const run = () => {
  let root = createRoot(host);
  act(() => root.render(<MultiplayerGame roomData={room('MULTIPLAYER_FFA')} username="Ann" wordOptions={[]} />));
  setTimeout(() => {
    const rows = [...host.querySelectorAll('.flex.items-center.justify-between.p-space-sm.rounded-xl')].filter((r) => /PTS/.test(r.textContent));
    check('FFA: 4 leaderboard rows', rows.length === 4, String(rows.length));
    const bad = rows.filter((row) => { const r = row.getBoundingClientRect(); return [...row.querySelectorAll('*')].some((el) => { const e = el.getBoundingClientRect(); return e.width && e.right > r.right + 1; }); });
    check('FFA: no score / name sticks out of its row (long name + 7-digit score)', bad.length === 0, bad.map((r) => r.textContent.slice(0, 30)).join(' | '));
    const order = rows.map((r) => r.querySelector('.tabular-nums').textContent);
    check('FFA: leaderboard ranked by score', order.join(',') === '9876543,123456,1500,0', order.join(','));
    act(() => root.unmount()); root = createRoot(host);
    act(() => root.render(<TeamGame roomData={room('TEAM')} username="Ann" wordOptions={[]} />));
    setTimeout(() => {
      const trows = [...host.querySelectorAll('div')].filter((d) => /pts$/.test(d.textContent.trim()) && d.children.length === 2);
      const tbad = trows.filter((row) => { const r = row.getBoundingClientRect(); return [...row.children].some((el) => { const e = el.getBoundingClientRect(); return e.right > r.right + 1; }); });
      check('Team: roster rows keep name and score inside (4 rows)', trows.length === 4 && tbad.length === 0, `${trows.length} rows, ${tbad.length} bad`);
      check('Team: the page is not wider than the window', document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        `${document.documentElement.scrollWidth} > ${document.documentElement.clientWidth}`);
      out.textContent = results.join('\n') + `\n\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`;
    }, 800);
  }, 800);
};
const waitTw = () => (window.tailwind ? setTimeout(run, 1500) : setTimeout(waitTw, 200));
waitTw();
