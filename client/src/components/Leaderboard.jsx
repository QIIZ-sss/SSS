import React, { useState, useEffect } from 'react';
import { GAME_MODES } from '../../../shared/gameConfig';

export default function Leaderboard() {
  const [modeFilter, setModeFilter] = useState('');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async (mode) => {
    setLoading(true);
    try {
      const url = mode ? `/api/leaderboard?gameMode=${mode}` : '/api/leaderboard';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setScores(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(modeFilter);
  }, [modeFilter]);

  const top1 = scores[0];
  const top2 = scores[1];
  const top3 = scores[2];

  return (
    <div className="w-full max-w-[1120px] mx-auto bg-surface-card rounded-xl p-space-md md:p-space-lg shadow-[6px_6px_0px_0px_#18181B] border-4 border-border-dark flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-md border-b-[3px] border-border-dark">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-tertiary-fixed border-2 border-border-dark flex items-center justify-center shadow-[2px_2px_0px_#18181B]">
            <span className="material-symbols-outlined text-border-dark text-[24px]">emoji_events</span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg uppercase text-border-dark">HALL OF FAME</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Global Rankings (Solo AI Mode excluded)</p>
          </div>
        </div>

        <div className="flex items-center gap-space-xs bg-surface-card-subtle p-1 border-2 border-border-dark rounded-xl">
          <button
            className={`font-label-md uppercase px-space-md py-1.5 rounded-lg border-2 transition-all ${
              modeFilter === '' ? 'bg-secondary-fixed text-on-secondary-fixed border-border-dark shadow-[2px_2px_0px_#18181B]' : 'border-transparent text-on-surface-variant'
            }`}
            onClick={() => setModeFilter('')}
            type="button"
          >
            ALL MODES
          </button>
          <button
            className={`font-label-md uppercase px-space-md py-1.5 rounded-lg border-2 transition-all ${
              modeFilter === GAME_MODES.MULTIPLAYER_FFA ? 'bg-secondary-fixed text-on-secondary-fixed border-border-dark shadow-[2px_2px_0px_#18181B]' : 'border-transparent text-on-surface-variant'
            }`}
            onClick={() => setModeFilter(GAME_MODES.MULTIPLAYER_FFA)}
            type="button"
          >
            FREE-FOR-ALL
          </button>
          <button
            className={`font-label-md uppercase px-space-md py-1.5 rounded-lg border-2 transition-all ${
              modeFilter === GAME_MODES.TEAM ? 'bg-secondary-fixed text-on-secondary-fixed border-border-dark shadow-[2px_2px_0px_#18181B]' : 'border-transparent text-on-surface-variant'
            }`}
            onClick={() => setModeFilter(GAME_MODES.TEAM)}
            type="button"
          >
            TEAM CLASH
          </button>
        </div>
      </div>

      {/* Podium Stage (Top 3 Players) */}
      <div className="grid grid-cols-3 gap-space-sm sm:gap-space-md items-end pt-space-lg pb-space-md max-w-[720px] mx-auto w-full">
        {/* 2nd Place */}
        <div className="flex flex-col items-center gap-space-xs">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-container-high border-3 border-border-dark flex items-center justify-center text-3xl shadow-[4px_4px_0px_#18181B] relative">
            🥈
            <span className="absolute -bottom-2 bg-slate-300 text-border-dark font-headline-sm text-headline-sm px-2 py-0.5 rounded-full border border-border-dark">#2</span>
          </div>
          <span className="font-headline-sm text-headline-sm text-border-dark truncate max-w-[100px] mt-2">
            {top2 ? top2.username : '---'}
          </span>
          <span className="font-label-md text-label-md text-primary-container font-bold">
            {top2 ? `${top2.totalScore.toLocaleString()} PTS` : '0 PTS'}
          </span>
        </div>

        {/* 1st Place (Center Champion Podium) */}
        <div className="flex flex-col items-center gap-space-xs -translate-y-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-tertiary-fixed border-4 border-border-dark flex items-center justify-center text-4xl shadow-[6px_6px_0px_#18181B] relative ring-4 ring-yellow-400">
            👑
            <span className="absolute -bottom-3 bg-tertiary-fixed text-border-dark font-headline-md text-headline-md px-3 py-0.5 rounded-full border-2 border-border-dark font-black">#1</span>
          </div>
          <span className="font-headline-md text-headline-md text-border-dark font-black truncate max-w-[140px] mt-3">
            {top1 ? top1.username : '---'}
          </span>
          <span className="font-headline-sm text-headline-sm text-primary-container font-black">
            {top1 ? `${top1.totalScore.toLocaleString()} PTS` : '0 PTS'}
          </span>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center gap-space-xs">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 border-3 border-border-dark flex items-center justify-center text-3xl shadow-[4px_4px_0px_#18181B] relative">
            🥉
            <span className="absolute -bottom-2 bg-amber-300 text-border-dark font-headline-sm text-headline-sm px-2 py-0.5 rounded-full border border-border-dark">#3</span>
          </div>
          <span className="font-headline-sm text-headline-sm text-border-dark truncate max-w-[100px] mt-2">
            {top3 ? top3.username : '---'}
          </span>
          <span className="font-label-md text-label-md text-primary-container font-bold">
            {top3 ? `${top3.totalScore.toLocaleString()} PTS` : '0 PTS'}
          </span>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="w-full bg-canvas-paper rounded-xl border-3 border-border-dark shadow-[4px_4px_0px_#18181B] p-space-md overflow-hidden">
        {loading ? (
          <div className="p-space-lg text-center font-headline-sm text-headline-sm text-on-surface-variant">Loading Leaderboard...</div>
        ) : (
          <div className="flex flex-col gap-space-xs">
            {scores.length === 0 ? (
              <div className="p-space-lg text-center font-headline-sm text-headline-sm text-on-surface-variant">
                No match scores recorded yet. Play a game to enter the Leaderboard!
              </div>
            ) : (
              scores.map((s, idx) => (
                <div
                  key={s.username}
                  className={`flex items-center justify-between p-space-sm rounded-xl border-2 border-border-dark ${
                    idx === 0 ? 'bg-tertiary-fixed shadow-[3px_3px_0px_#18181B]' : idx === 1 ? 'bg-slate-100' : idx === 2 ? 'bg-amber-50' : 'bg-surface-card'
                  }`}
                >
                  <div className="flex items-center gap-space-md">
                    <span className="font-headline-md text-headline-md text-border-dark w-10 text-center font-black">
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-surface-container border border-border-dark flex items-center justify-center text-xl shadow-sm">
                      {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎨'}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-border-dark">{s.username}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{s.gamesCount} Matches Played</span>
                    </div>
                  </div>

                  <span className="font-headline-md text-headline-md text-primary-container font-black">
                    {s.totalScore.toLocaleString()} PTS
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
