import React from 'react';
import { GAME_MODES } from '../../../shared/gameConfig';
import { SOLO_AI } from '../../../shared/contract';

// T1-25: one result screen for FFA, Team and Solo, built only from the server's game_over payload
// ({ gameMode, finalScores (ranked: score desc, stable ties — T1-02), teamScores, stopped, reason }).
// Ties are derived from the scores (never an arbitrary winner); 0-point players are always listed.

const scoreOf = (p) => Number(p.score) || 0;
// competition ranking on an already sorted list: equal scores share a place (1, 1, 3)
const withPlaces = (list) => list.map((p) => ({ ...p, place: 1 + list.filter((q) => scoreOf(q) > scoreOf(p)).length }));
const placeLabel = (n) => (n === 1 ? '1ST' : n === 2 ? '2ND' : n === 3 ? '3RD' : `${n}TH`);
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TEAM_STYLE = { Red: 'bg-timer-red text-on-error', Blue: 'bg-accent-blue text-on-tertiary' };

// dim: grey out everyone who is not a winner (off for a stopped match: no winner)
function Podium({ players, winners, dim = true, id }) {
  return (
    <ol className="grid grid-cols-3 gap-space-xs items-end" id={id}>
      {players.slice(0, 3).map((p) => {
        const win = winners.includes(p.username);
        return (
          <li key={p.username} data-winner={win ? 'true' : 'false'}
            className={`min-w-0 flex flex-col items-center gap-0.5 rounded-xl border-2 border-border-dark p-space-xs ${
              win ? 'bg-tertiary-fixed shadow-[3px_3px_0px_#18181B]' : `bg-surface-container ${dim ? 'opacity-60' : ''}`} ${p.place === 1 ? 'pb-space-md' : ''}`}>
            <span className="text-2xl leading-none" aria-hidden="true">{MEDAL[p.place] || ''}</span>
            <span className="text-2xl leading-none">{p.avatar || '🐶'}</span>
            <span className="font-label-md text-label-md font-bold text-border-dark truncate max-w-full">{p.username}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{placeLabel(p.place)} · {scoreOf(p)} PTS</span>
          </li>
        );
      })}
    </ol>
  );
}

function Ranking({ players, winners, dim = true, id }) {
  return (
    <ul className="flex flex-col gap-1" id={id}>
      {players.map((p) => {
        const win = winners.includes(p.username);
        return (
          <li key={p.username} data-winner={win ? 'true' : 'false'}
            className={`flex justify-between items-center gap-2 p-space-xs rounded border border-border-dark ${win ? 'bg-tertiary-fixed font-bold' : `bg-surface-container ${dim ? 'opacity-60' : ''}`}`}>
            <span className="min-w-0 truncate">#{p.place} {p.avatar || '🐶'} {p.username}</span>
            <span className="shrink-0 font-bold">{scoreOf(p)} PTS</span>
          </li>
        );
      })}
    </ul>
  );
}

function FfaResult({ result }) {
  const players = withPlaces(result.finalScores || []);
  const top = players.length ? scoreOf(players[0]) : null;
  const winners = result.stopped ? [] : players.filter((p) => scoreOf(p) === top).map((p) => p.username);
  const tie = winners.length > 1;
  return (
    <>
      {!result.stopped && (
        <p className="font-headline-md text-headline-md font-black text-border-dark" id="resultBanner">
          {tie ? `TIE — ${winners.join(' & ')}` : winners.length ? `WINNER: ${winners[0]}` : 'NO PLAYERS'}
        </p>
      )}
      <Podium players={players} winners={winners} dim={!result.stopped} id="podium" />
      <div className="text-left flex flex-col gap-1">
        <h4 className="font-headline-sm text-headline-sm text-border-dark uppercase">FULL RANKING</h4>
        <Ranking players={players} winners={winners} dim={!result.stopped} id="fullRanking" />
      </div>
    </>
  );
}

function TeamResult({ result }) {
  const total = (t) => Number(result.teamScores?.[t]?.score) || 0;
  const tie = total('Red') === total('Blue');
  const winner = tie ? null : total('Red') > total('Blue') ? 'Red' : 'Blue';
  const order = winner === 'Blue' ? ['Blue', 'Red'] : ['Red', 'Blue']; // winning team first (Red first on a tie)
  return (
    <>
      {!result.stopped && (
        <p className="font-headline-md text-headline-md font-black text-border-dark" id="resultBanner">
          {tie ? 'TIE' : `TEAM ${winner.toUpperCase()} WINS`}
        </p>
      )}
      <div className="flex flex-col gap-space-md" id="teamResults">
        {order.map((t) => {
          const label = result.stopped ? '' : tie ? 'TIE' : t === winner ? 'WINNER' : 'DEFEATED';
          // never merge teams: each team ranks only its own players (server order kept)
          const players = withPlaces((result.finalScores || []).filter((p) => p.team === t));
          // the winning team (both on a tie) is highlighted, the defeated team dimmed
          const highlighted = label === 'WINNER' || label === 'TIE';
          const teamWinners = highlighted ? players.map((p) => p.username) : [];
          return (
            <section key={t} id={`team-${t}`} data-result={label || 'STOPPED'}
              className={`text-left flex flex-col gap-space-xs rounded-xl border-2 border-border-dark p-space-sm bg-surface-card ${highlighted ? 'shadow-[3px_3px_0px_#18181B]' : ''}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded font-bold border border-border-dark ${TEAM_STYLE[t]}`}>TEAM {t.toUpperCase()}</span>
                {label && <span className="font-label-md text-label-md font-black text-border-dark" data-label>{label}</span>}
                <span className="font-headline-sm text-headline-sm font-black text-border-dark" id={`teamTotal-${t}`}>{total(t)} PTS</span>
              </div>
              <Podium players={players} winners={teamWinners} dim={!result.stopped} id={`podium-${t}`} />
              <Ranking players={players} winners={teamWinners} dim={!result.stopped} id={`ranking-${t}`} />
            </section>
          );
        })}
      </div>
    </>
  );
}

function SoloResult({ result, username }) {
  const me = (result.finalScores || [])[0] || { username, score: 0 };
  const drawings = Math.floor(scoreOf(me) / SOLO_AI.CORRECT_SCORE);
  // Contenders are a list so the AI can be added once it scores (T1-23); until then only the player is shown.
  const contenders = [{ key: 'player', name: me.username, avatar: me.avatar || '🐶', score: scoreOf(me) }];
  return (
    <>
      <div className="flex flex-wrap justify-center gap-space-sm" id="soloContenders">
        {contenders.map((c) => (
          <div key={c.key} className="min-w-[10rem] flex flex-col items-center gap-1 rounded-xl border-2 border-border-dark bg-tertiary-fixed p-space-sm shadow-[3px_3px_0px_#18181B]">
            <span className="text-3xl">{c.avatar}</span>
            <span className="font-label-md text-label-md font-bold text-border-dark">{c.name}</span>
            <span className="font-headline-md text-headline-md font-black text-border-dark" id="soloScore">{c.score} PTS</span>
          </div>
        ))}
      </div>
      <p className="font-body-md text-body-md text-border-dark" id="soloResult">
        {result.stopped ? 'Practice stopped.' : `Practice complete — the AI guessed ${drawings} of your drawing${drawings === 1 ? '' : 's'}.`}
      </p>
    </>
  );
}

export default function ResultScreen({ result, username, onLeave }) {
  const mode = result.gameMode;
  return (
    <div className="fixed inset-0 z-50 bg-border-dark/80 flex items-center justify-center p-space-sm sm:p-space-md">
      <div className="bg-canvas-paper border-4 border-border-dark shadow-[8px_8px_0px_#18181B] rounded-2xl p-space-md sm:p-space-xl max-w-[560px] w-full max-h-[92vh] overflow-y-auto text-center flex flex-col gap-space-md" id="resultScreen" data-mode={mode}>
        <h2 className="font-headline-xl text-headline-xl uppercase text-border-dark">{result.stopped ? '⚠️ MATCH STOPPED' : '🏆 MATCH RESULTS'}</h2>
        {result.stopped && result.reason && (
          <p className="font-body-md text-body-md text-border-dark" id="matchStoppedReason">{result.reason}</p>
        )}
        {mode === GAME_MODES.TEAM ? <TeamResult result={result} />
          : mode === GAME_MODES.SOLO_AI ? <SoloResult result={result} username={username} />
          : <FfaResult result={result} />}
        <button
          className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:opacity-90 transition-all"
          onClick={onLeave}
          id="leaveRoomButton"
          type="button"
        >
          LEAVE ROOM
        </button>
      </div>
    </div>
  );
}
