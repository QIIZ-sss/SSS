import React, { useState } from 'react';
import Canvas from '../components/Canvas';
import ChatBox from '../components/ChatBox';
import ChallengeOverlay from '../components/ChallengeOverlay';
import TimerBadge from '../components/TimerBadge';
import RoomLobby from '../components/RoomLobby';
import useGameTimer from '../hooks/useGameTimer';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';

export default function MultiplayerGame({ roomData, username, wordOptions }) {
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

  return (
    <div className="w-full flex flex-col gap-space-lg">
      {/* TOP ARENA STATUS BAR (Cabinet Neo-Brutalist Header) */}
      <div className="w-full bg-canvas-paper rounded-xl p-space-md border-4 border-border-dark shadow-[6px_6px_0px_0px_#18181B] flex flex-wrap items-center justify-between gap-space-md">
        {/* Drawer Info & Secret Word / Prompt Hint */}
        <div className="flex items-center flex-wrap gap-space-md">
          <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-xs rounded-full border-2 border-border-dark shadow-sm">
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary shadow-sm">
              <span className="material-symbols-outlined text-[20px]">brush</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{roomData.currentDrawer}</span>
                <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-1.5 py-0.5 rounded-full uppercase font-bold">
                  {isDrawer ? 'YOU (DRAWER)' : 'DRAWER'}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Drawing target sketch...</p>
            </div>
          </div>

          {/* Secret Word Display: Prominently displayed to drawer */}
          <div className="flex items-center gap-space-sm bg-tertiary-fixed border-2 border-border-dark px-space-md py-space-xs rounded-xl shadow-[3px_3px_0px_#18181B]">
            <span className="material-symbols-outlined text-border-dark text-[22px]">lightbulb</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed uppercase font-bold">
                {isDrawer ? '🎯 YOUR SECRET WORD TO DRAW' : 'SECRET WORD'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md text-border-dark tracking-wider font-black uppercase">
                  {currentSecretWord}
                </span>
                <span className="font-label-sm text-label-sm bg-surface-bright text-border-dark px-2 py-0.5 rounded font-bold tracking-widest border border-border-dark">
                  ({roomData.wordLength || currentSecretWord.length} CHARS)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Turn Timer & Match State */}
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

      {/* MAIN ARENA GRID (3-Column layout: Standings, Canvas Stage, Chat Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT SIDEBAR: Live Standings / Roster (Cols 3) */}
        <aside className="lg:col-span-3 flex flex-col gap-space-md">
          <div className="bg-canvas-paper rounded-xl p-space-md border-3 border-border-dark shadow-[4px_4px_0px_0px_#18181B] flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b-2 border-border-dark">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-tertiary-container text-[20px]">leaderboard</span>
                <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface font-black">LEADERBOARD</h2>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant font-bold border border-border-dark">
                {roomData.players.length} PLAYERS
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              {roomData.players.map((p, idx) => {
                const isGuessed = roomData.correctGuessers ? roomData.correctGuessers.includes(p.username) : false;
                const isMe = p.username === username;

                return (
                  <div
                    key={p.username}
                    className={`flex items-center justify-between p-space-sm rounded-xl border-2 border-border-dark transition-transform hover:-translate-y-0.5 ${
                      isMe ? 'bg-surface-container-high shadow-md' : 'bg-surface-card shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-headline-sm text-headline-sm shadow-sm border border-border-dark">
                          {p.avatar || '🐶'}
                        </div>
                        <div className="absolute -top-1 -left-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-border-dark">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-headline-sm text-headline-sm truncate text-on-surface font-bold">{p.username}</span>
                          {isMe && <span className="bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">ME</span>}
                        </div>
                        {isGuessed && (
                          <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5 font-bold">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> GUESSED!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-headline-sm text-headline-sm text-on-surface block font-bold">{p.score}</span>
                      <span className="font-label-sm text-label-sm text-primary-container font-bold">PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: Canvas Workstation (Cols 6) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {roomData.status === 'WORD_SELECTION' && isDrawer && (
            <div className="w-full max-w-[640px] bg-canvas-paper rounded-xl p-space-lg border-4 border-border-dark shadow-[6px_6px_0px_0px_#18181B] mb-space-md text-center flex flex-col gap-space-md">
              <h3 className="font-headline-md text-headline-md text-border-dark uppercase font-black">🎨 SELECT WORD TO DRAW:</h3>
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
