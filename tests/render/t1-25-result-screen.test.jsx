// T1-25: universal result screen content — FFA podium + full ranking, Team sections (winner first, WINNER / DEFEATED /
// TIE, totals, own Top 3 + ranking, never merged), Solo (T1-23: human vs AI, WINNER / TIE), ties, 0-point players, server
// order kept (T1-02), winner highlighted / others dimmed, stopped match, LEAVE ROOM, nothing beyond the payload shown.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultScreen from '../../client/src/components/ResultScreen.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const P = (u, s, t = 'Red') => ({ username: u, avatar: '🐶', score: s, team: t });
const base = { winnerText: 'from server', stopped: false, reason: '', teamScores: { Red: { score: 0 }, Blue: { score: 0 } } };
const html = (r) => renderToStaticMarkup(<ResultScreen result={r} username="Ann" onLeave={() => {}} />);
const block = (h, id, tag) => (h.match(new RegExp(`<${tag}[^>]*id="${id}"[^>]*>([\\s\\S]*?)</${tag}>`)) || ['', ''])[1];
const rows = (h, id) => [...block(h, id, id.startsWith('podium') ? 'ol' : 'ul').matchAll(/<li[^>]*data-winner="(true|false)"[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/li>/g)]
  .map(([, w, cls, inner]) => {
    const spans = [...inner.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    // ranking rows: label "#place avatar name" + "N PTS"
    return { win: w === 'true', dim: /opacity-60/.test(cls), text: spans.join(' '), label: spans[0], pts: spans[spans.length - 1] };
  });

{ // FFA: podium, full ranking, 0 points, shared places, winner highlighted, others dimmed
  const h = html({ ...base, gameMode: 'MULTIPLAYER_FFA', finalScores: [P('Ann', 900), P('Bo', 500), P('Cy', 500), P('Dee', 0), P('Eve', 0)] });
  const pod = rows(h, 'podium'), all = rows(h, 'fullRanking');
  check('FFA: banner WINNER: Ann (no TIE)', /id="resultBanner">WINNER: Ann</.test(h) && !/TIE/.test(block(h, 'resultBanner', 'p')));
  check('FFA: Top 3 podium = Ann 1ST, Bo 2ND, Cy 2ND (equal scores share a place)', pod.length === 3 && /Ann.*1ST · 900 PTS/.test(pod[0].text)
    && /Bo.*2ND · 500 PTS/.test(pod[1].text) && /Cy.*2ND · 500 PTS/.test(pod[2].text), pod.map((r) => r.text).join(' | '));
  check('FFA: full ranking lists all 5 in server order with places 1, 2, 2, 4, 4', all.length === 5
    && ['#1 🐶 Ann', '#2 🐶 Bo', '#2 🐶 Cy', '#4 🐶 Dee', '#4 🐶 Eve'].every((s, i) => all[i].label === s), all.map((r) => r.text).join(' | '));
  check('FFA: 0-point players shown', all.filter((r) => r.pts === '0 PTS').map((r) => r.label).join(',') === '#4 🐶 Dee,#4 🐶 Eve');
  check('FFA: winner highlighted, everyone else dimmed', all[0].win && !all[0].dim && all.slice(1).every((r) => !r.win && r.dim) && pod[0].win && pod.slice(1).every((r) => r.dim));
  check('FFA: the server winnerText is not used (ties are derived from scores)', !h.includes('from server'));
}
{ // FFA ties: never an arbitrary winner
  const t = html({ ...base, gameMode: 'MULTIPLAYER_FFA', finalScores: [P('Ann', 500), P('Bo', 500), P('Cy', 100)] });
  const all = rows(t, 'fullRanking');
  check('FFA tie at the top: banner "TIE — Ann & Bo", no WINNER', /id="resultBanner">TIE — Ann &amp; Bo</.test(t) && !/WINNER/.test(t));
  check('FFA tie: both tied players highlighted, the rest dimmed', all[0].win && all[1].win && !all[2].win && all[2].dim);
  const z = html({ ...base, gameMode: 'MULTIPLAYER_FFA', finalScores: [P('Ann', 0), P('Bo', 0)] });
  check('FFA all 0 points: TIE, both listed', /TIE — Ann &amp; Bo/.test(z) && rows(z, 'fullRanking').length === 2);
  const order = html({ ...base, gameMode: 'MULTIPLAYER_FFA', finalScores: [P('Cy', 500), P('Bo', 500), P('Ann', 100)] });
  check('T1-02: server order kept for equal scores (stable ties: Cy before Bo as sent)', rows(order, 'fullRanking').map((r) => r.label).join(',') === '#1 🐶 Cy,#1 🐶 Bo,#3 🐶 Ann');
}
{ // Team: winner first, labels, totals, own Top 3 + own ranking, never merged
  const fs = [P('Ann', 900, 'Red'), P('Bo', 700, 'Blue'), P('Dee', 600, 'Blue'), P('Eve', 500, 'Blue'), P('Cy', 0, 'Red'), P('Fay', 0, 'Blue')];
  const h = html({ ...base, gameMode: 'TEAM', teamScores: { Red: { score: 900 }, Blue: { score: 1800 } }, finalScores: fs });
  const sections = [...h.matchAll(/<section[^>]*id="team-(Red|Blue)"[^>]*data-result="([A-Z]+)"/g)].map((m) => `${m[1]}:${m[2]}`);
  check('Team: banner TEAM BLUE WINS', /id="resultBanner">TEAM BLUE WINS</.test(h));
  check('Team: winning team first; Blue WINNER, Red DEFEATED', sections.join(',') === 'Blue:WINNER,Red:DEFEATED', sections.join(','));
  check('Team: totals 1800 / 900', /id="teamTotal-Blue">1800 PTS</.test(h) && /id="teamTotal-Red">900 PTS</.test(h));
  const bp = rows(h, 'podium-Blue'), br = rows(h, 'ranking-Blue'), rp = rows(h, 'podium-Red'), rr = rows(h, 'ranking-Red');
  check('Team Blue: own Top 3 = Bo, Dee, Eve', bp.length === 3 && /Bo/.test(bp[0].text) && /Dee/.test(bp[1].text) && /Eve/.test(bp[2].text), bp.map((r) => r.text).join(' | '));
  check('Team Blue: own ranking = Bo, Dee, Eve, Fay (0 pts) with places 1–4', br.map((r) => `${r.label} ${r.pts}`).join(',') === '#1 🐶 Bo 700 PTS,#2 🐶 Dee 600 PTS,#3 🐶 Eve 500 PTS,#4 🐶 Fay 0 PTS', br.map((r) => r.label).join(','));
  check('Team Red: own Top 3 + ranking = Ann, Cy (0 pts) — places restart per team', rp.length === 2 && rr.map((r) => `${r.label} ${r.pts}`).join(',') === '#1 🐶 Ann 900 PTS,#2 🐶 Cy 0 PTS', rr.map((r) => r.label).join(','));
  check('Team: players never merged (no Red player in Blue lists, no Blue player in Red lists)',
    ![...bp, ...br].some((r) => /Ann|Cy/.test(r.text)) && ![...rp, ...rr].some((r) => /Bo|Dee|Eve|Fay/.test(r.text)));
  check('Team: winning team highlighted, defeated team dimmed', [...bp, ...br].every((r) => r.win && !r.dim) && [...rp, ...rr].every((r) => !r.win && r.dim));
  const tie = html({ ...base, gameMode: 'TEAM', teamScores: { Red: { score: 800 }, Blue: { score: 800 } }, finalScores: fs });
  const ts = [...tie.matchAll(/id="team-(Red|Blue)"[^>]*data-result="([A-Z]+)"/g)].map((m) => `${m[1]}:${m[2]}`);
  check('Team tie: banner TIE, both teams TIE (Red first), nobody dimmed, no WINNER', /id="resultBanner">TIE</.test(tie) && ts.join(',') === 'Red:TIE,Blue:TIE'
    && !/WINNER|DEFEATED/.test(tie) && !/opacity-60/.test(tie), ts.join(','));
}
{ // Solo (T1-23): human vs AI from the payload, WINNER / TIE, no invented AI score
  const solo = (human, ai, extra = {}) => html({ ...base, gameMode: 'SOLO_AI', finalScores: [P('Ann', human)], ...(ai === undefined ? {} : { aiScore: ai }), ...extra });
  const win = solo(760, 300);
  check('Solo: human and AI scores shown', /id="soloScore">760 PTS</.test(win) && /id="soloAiScore">300 PTS</.test(win));
  check('Solo: human ahead → WINNER: Ann, AI card dimmed', /id="resultBanner">WINNER: Ann</.test(win)
    && /id="soloPlayerCard" data-winner="true"/.test(win) && /id="soloAiCard" data-winner="false"[^>]*opacity-60/.test(win));
  const lose = solo(100, 800);
  check('Solo: AI ahead → WINNER: AI', /id="resultBanner">WINNER: AI</.test(lose) && /id="soloAiCard" data-winner="true"/.test(lose));
  const tie = solo(300, 300);
  check('Solo: equal scores → TIE, both highlighted, nobody dimmed', /id="resultBanner">TIE</.test(tie) && !/WINNER/.test(tie) && (tie.match(/data-winner="true"/g) || []).length === 2 && !/opacity-60/.test(tie));
  const zero = solo(0, 0);
  check('Solo: 0 – 0 → TIE with both 0 PTS shown', /TIE/.test(zero) && /id="soloScore">0 PTS</.test(zero) && /id="soloAiScore">0 PTS</.test(zero));
  const none = solo(500);
  check('Solo: payload without aiScore → no AI card, no banner (no invented score)', !none.includes('soloAiCard') && !none.includes('resultBanner') && (none.match(/PTS/g) || []).length === 1);
  check('Solo: no podium / ranking lists', !win.includes('podium') && !win.includes('fullRanking'));
}
{ // stopped match (T1-22), LEAVE ROOM, no extra data
  const h = html({ ...base, gameMode: 'MULTIPLAYER_FFA', stopped: true, reason: 'Not enough players left', finalScores: [P('Ann', 300), P('Bo', 0)] });
  check('stopped: MATCH STOPPED + reason, no banner, no winner, nobody dimmed', /MATCH STOPPED/.test(h) && /id="matchStoppedReason">Not enough players left</.test(h)
    && !h.includes('resultBanner') && !/data-winner="true"/.test(h) && !/opacity-60/.test(h));
  const n = html({ ...base, gameMode: 'MULTIPLAYER_FFA', finalScores: [P('Ann', 300)], currentWord: 'Elephant', word: 'Elephant' });
  check('only payload result fields are shown (an extra answer field is never rendered)', !/Elephant/.test(n));
  check('LEAVE ROOM button present', /<button[^>]*id="leaveRoomButton"[^>]*>LEAVE ROOM<\/button>/.test(n));
}
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
