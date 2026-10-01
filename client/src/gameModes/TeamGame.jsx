import React, { useState } from 'react';
import Canvas from '../components/Canvas';
import ChatBox from '../components/ChatBox';
import ChallengeOverlay from '../components/ChallengeOverlay';
import TimerBadge from '../components/TimerBadge';
import RoomLobby from '../components/RoomLobby';
import useGameTimer from '../hooks/useGameTimer';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';

export default function TeamGame({ roomData, username, wordOptions }) {
  const isDrawer = roomData.currentDrawer === username;
  const timeRemaining = useGameTimer(roomData.timeRemaining || 0);
  const [chosenWord, setChosenWord] = useState('');

  const handleSelectWord = (word) => {
    setChosenWord(word);
    socket.emit(SOCKET_EVENTS.SELECT_WORD, { word });
  };

  if (roomData.status === 'LOBBY') {
    return <RoomLobby roomData={roomData} username={username} />;
  }

  const currentSecretWord = isDrawer
    ? (chosenWord || roomData.currentWord || 'SELECTING WORD...')
    : '_ '.repeat(roomData.wordLength || 4);

  const redPlayers = roomData.players.filter((p) => p.team === 'Red');
  const bluePlayers = roomData.players.filter((p) => p.team === 'Blue');

  return (
    <div className="w-full flex flex-col gap-space-lg">
      {/* TOP ARENA STATUS BAR (Cabinet Neo-Brutalist Header) */}
      <div className="w-full bg-canvas-paper rounded-xl p-space-md border-4 border-border-dark shadow-[6px_6px_0px_0px_#18181B] flex flex-wrap items-center justify-between gap-space-md">
        {/* Team Scores Banner */}
        <div className="flex items-center flex-wrap gap-space-md">
          <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-xs rounded-full border-2 border-border-dark shadow-sm">
            <span className="font-headline-sm text-headline-sm text-border-dark font-black uppercase">⚔️ TEAM CLASH</span>
          </div>

          <div className="flex items-center gap-space-xs">
            <div className="bg-timer-red text-on-error font-headline-md text-headline-md px-space-md py-1 rounded-xl border-2 border-border-dark shadow-[2px_2px_0px_#18181B] font-black">
              🔴 RED: {roomData.teams?.Red?.score || 0} PTS
            </div>
            <span className="font-headline-md text-headline-md text-border-dark font-black">VS</span>
            <div className="bg-accent-blue text-on-tertiary font-headline-md text-headline-md px-space-md py-1 rounded-xl border-2 border-border-dark shadow-[2px_2px_0px_#18181B] font-black">
              🔵 BLUE: {roomData.teams?.Blue?.score || 0} PTS
            </div>
          </div>

          {/* Secret Word Badge */}
          <div className="flex items-center gap-space-sm bg-tertiary-fixed border-2 border-border-dark px-space-md py-space-xs rounded-xl shadow-[3px_3px_0px_#18181B]">
            <span className="material-symbols-outlined text-border-dark text-[20px]">lightbulb</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed uppercase font-bold">
                {isDrawer ? '🎯 YOUR SECRET WORD' : 'TEAM GUESS WORD'}
              </span>
              <span className="font-headline-md text-headline-md text-border-dark tracking-wider font-black uppercase">
                {currentSecretWord}
              </span>
            </div>
          </div>
        </div>

        {/* Turn Timer & Round Info */}
        <div className="flex items-center gap-space-sm ml-auto">
          <div className="bg-surface-card border-2 border-border-dark px-space-md py-space-xs rounded-xl shadow-sm text-center">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant block font-bold">MATCH</span>
            <span className="font-headline-sm text-headline-sm text-secondary font-black">
              ROUND {roomData.currentRound} / {roomData.totalRounds}
            </span>
          </div>
          <TimerBadge seconds={timeRemaining} />
        </div>
      </div>

      <ChallengeOverlay
        challenge={roomData.currentChallenge}
        forcedColor={roomData.forcedColor}
      />

      {/* MAIN ARENA GRID (Left: Teams Roster, Center: Canvas, Right: Chat Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT SIDEBAR: Team Rosters (Cols 3) */}
        <aside className="lg:col-span-3 flex flex-col gap-space-md">
          <div className="bg-canvas-paper rounded-xl p-space-md border-3 border-border-dark shadow-[4px_4px_0px_0px_#18181B] flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b-2 border-border-dark">
              <h3 className="font-headline-sm text-headline-sm uppercase text-border-dark font-black">⚔️ TEAM ROSTERS</h3>
            </div>

            {/* Red Team Roster */}
            <div className="flex flex-col gap-space-xs">
              <div className="bg-timer-red text-on-error font-label-md text-label-md px-space-sm py-1 rounded-lg border border-border-dark font-black flex justify-between items-center">
                <span>🔴 TEAM RED</span>
                <span>{redPlayers.length} PLAYERS</span>
              </div>
              {redPlayers.map((p) => (
                <div key={p.username} className="flex items-center justify-between p-space-xs bg-surface-card rounded-lg border border-border-dark font-body-sm text-body-sm">
                  <span>{p.avatar || '🐶'} {p.username} {p.username === username ? '(ME)' : ''}</span>
                  <span className="font-bold">{p.score} pts</span>
                </div>
              ))}
            </div>

            {/* Blue Team Roster */}
            <div className="flex flex-col gap-space-xs pt-space-xs border-t border-border-dark/30">
              <div className="bg-accent-blue text-on-tertiary font-label-md text-label-md px-space-sm py-1 rounded-lg border border-border-dark font-black flex justify-between items-center">
                <span>🔵 TEAM BLUE</span>
                <span>{bluePlayers.length} PLAYERS</span>
              </div>
              {bluePlayers.map((p) => (
                <div key={p.username} className="flex items-center justify-between p-space-xs bg-surface-card rounded-lg border border-border-dark font-body-sm text-body-sm">
                  <span>{p.avatar || '🐶'} {p.username} {p.username === username ? '(ME)' : ''}</span>
                  <span className="font-bold">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: Canvas Workstation (Cols 6) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {roomData.status === 'WORD_SELECTION' && isDrawer && (
            <div className="w-full max-w-[640px] bg-canvas-paper rounded-xl p-space-lg border-4 border-border-dark shadow-[6px_6px_0px_0px_#18181B] mb-space-md text-center flex flex-col gap-space-md">
              <h3 className="font-headline-md text-headline-md text-border-dark uppercase font-black">🎨 SELECT WORD FOR TEAMS TO GUESS:</h3>
              <div className="flex justify-center gap-space-sm flex-wrap">
                {wordOptions.map((w) => (
                  <button
                    key={w}
                    className="px-space-lg py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    onClick={() => handleSelectWord(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {roomData.status === 'WORD_SELECTION' && !isDrawer && (
            <div className="w-full max-w-[640px] bg-tertiary-fixed p-space-md rounded-xl border-3 border-border-dark shadow-md text-center font-headline-sm text-headline-sm uppercase text-on-tertiary-fixed mb-space-md">
              ⌛ Waiting for <strong>{roomData.currentDrawer}</strong> to choose a word...
            </div>
          )}

          <Canvas
            isDrawer={isDrawer && roomData.status === 'PLAYING'}
            challenge={roomData.currentChallenge}
            forcedColor={roomData.forcedColor}
          />
        </div>

        {/* RIGHT SIDEBAR: Chat & Guess Feed (Cols 3) */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <ChatBox
            username={username}
            isDrawer={isDrawer}
            roomStatus={roomData.status}
          />
        </div>
      </div>
    </div>
  );
}
