// T1-02: game_over.finalScores is ranked — FFA by score; Team: higher-scoring team's players first, then by score.
const L = require('../lib/e2e-lib');
const desc = (xs) => xs.every((x, i) => i === 0 || xs[i - 1] >= x);

async function play(mode, n) {
  const ps = Array.from({ length: n }, (_, i) => L.player(L.nextName('P' + i), { guessDelay: 50 + i * 400 })); // different guess speed → different scores
  const { code } = await L.makeRoom(ps[0], { gameMode: mode, totalRounds: 1 });
  for (const p of ps.slice(1)) await L.join(p, code);
  ps.slice(1).forEach((p) => p.s.emit('toggle_ready')); await L.sleep(300);
  ps[0].s.emit('start_game');
  await L.waitFor(() => ps[0].gameOver, 90000);
  L.closeAll(...ps);
  return ps[0].gameOver;
}

(async () => {
  const ffa = await play('MULTIPLAYER_FFA', 3);
  const fs = ffa ? ffa.finalScores.map((p) => p.score) : [];
  L.check('FFA: finalScores sorted by score, highest first', ffa && fs.length === 3 && desc(fs), JSON.stringify(fs));
  L.check('FFA: winnerText names the first ranked player', ffa && ffa.winnerText.includes(ffa.finalScores[0].username), ffa && ffa.winnerText);
  L.check('game_over carries gameMode', ffa && ffa.gameMode === 'MULTIPLAYER_FFA');

  const team = await play('TEAM', 4);
  if (team) {
    const ts = team.teamScores, fsT = team.finalScores;
    const lead = ts.Red.score >= ts.Blue.score ? 'Red' : 'Blue';
    const firstOther = fsT.findIndex((p) => p.team !== lead);
    const grouped = firstOther === -1 || fsT.slice(firstOther).every((p) => p.team !== lead);
    const within = ['Red', 'Blue'].every((t) => desc(fsT.filter((p) => p.team === t).map((p) => p.score)));
    L.check('Team: players of the leading team are ranked first', fsT[0].team === lead && grouped, `${JSON.stringify(ts)} → ${fsT.map((p) => `${p.team}:${p.score}`).join(' ')}`);
    L.check('Team: within each team sorted by score', within, fsT.map((p) => `${p.team}:${p.score}`).join(' '));
    L.check('Team: gameMode TEAM in game_over', team.gameMode === 'TEAM');
  } else L.check('Team game finished', false);
  L.finish();
})();
