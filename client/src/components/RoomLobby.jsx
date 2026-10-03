import React, { useState } from 'react';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';
import { CHALLENGE_DETAILS, GAME_MODES } from '../../../shared/gameConfig';
import { GAME_RULES, WORD_DIFFICULTY } from '../../../shared/contract';
import ChatBox from './ChatBox';

export default function RoomLobby({ roomData, username }) {
  const [copied, setCopied] = useState(false);

  const isHost = roomData.host === username;
  const meReady = (roomData.players.find((p) => p.username === username) || {}).isReady;

  // UX only — the server enforces the same shared rules (GAME_RULES) on start_game
  const notReadyPlayers = GAME_RULES.REQUIRE_ALL_READY
    ? roomData.players.filter((p) => p.username !== roomData.host && !p.isReady)
    : [];
  const redCount = roomData.players.filter((p) => p.team === 'Red').length;
  const blueCount = roomData.players.filter((p) => p.team === 'Blue').length;
  // Solo vs AI is single-player (server enforces it): no roster, no Ready, no max players
  const isSolo = roomData.gameMode === GAME_MODES.SOLO_AI;
  const isTeamMode = roomData.gameMode === GAME_MODES.TEAM;
  const myTeam = (roomData.players.find((p) => p.username === username) || {}).team;
  const othersInRoom = roomData.players.some((p) => p.username !== roomData.host);
  const SOLO_BLOCKED = 'Solo vs AI is single-player: everyone else must leave the room first';
  let startBlockReason = null;
  if (isSolo) {
    startBlockReason = othersInRoom ? SOLO_BLOCKED : null;
  } else if (roomData.gameMode === GAME_MODES.MULTIPLAYER_FFA && roomData.players.length < GAME_RULES.MIN_PLAYERS_FFA) {
    startBlockReason = `At least ${GAME_RULES.MIN_PLAYERS_FFA} players are required`;
  } else if (
    roomData.gameMode === GAME_MODES.TEAM &&
    (roomData.players.length < GAME_RULES.MIN_PLAYERS_TEAM_TOTAL ||
      redCount < GAME_RULES.MIN_PLAYERS_PER_TEAM ||
      blueCount < GAME_RULES.MIN_PLAYERS_PER_TEAM)
  ) {
    startBlockReason = `Each team needs at least ${GAME_RULES.MIN_PLAYERS_PER_TEAM} player(s)`;
  } else if (notReadyPlayers.length > 0) {
    startBlockReason = `Waiting for: ${notReadyPlayers.map((p) => p.username).join(', ')}`;
  }
  const enabledChallenges = roomData.enabledChallenges || Object.keys(CHALLENGE_DETAILS);

  const handleCopyCode = () => {
    const code = roomData.code || roomData.id;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    socket.emit(SOCKET_EVENTS.TOGGLE_READY);
  };

  const handleStartGame = () => {
    if (startBlockReason) return;
    socket.emit(SOCKET_EVENTS.START_GAME);
  };

  const handleUpdateSetting = (update) => {
    if (!isHost) return;
    socket.emit(SOCKET_EVENTS.UPDATE_ROOM_SETTINGS, update);
  };

  const handleToggleChallenge = (challengeKey) => {
    if (!isHost) return;
    let updated;
    if (enabledChallenges.includes(challengeKey)) {
      if (enabledChallenges.length <= 1) return; // Keep at least one challenge enabled
      updated = enabledChallenges.filter((c) => c !== challengeKey);
    } else {
      updated = [...enabledChallenges, challengeKey];
    }
    handleUpdateSetting({ enabledChallenges: updated });
  };

  return (
    <div className="w-full max-w-[1120px] mx-auto bg-surface-card rounded-xl p-space-md md:p-space-lg shadow-[6px_6px_0px_0px_#18181B] border-4 border-border-dark relative">
      {/* Top Header Bar inside cabinet */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg border-b-[3px] border-border-dark">
        {/* Left: Room ID Badge & Copy */}
        <div className="flex items-center gap-space-sm flex-wrap">
          {/* T1-19: a Solo room cannot be joined, so it shows no code to share */}
          {isSolo ? (
            <div className="bg-tertiary-fixed px-space-md py-1.5 rounded-full flex items-center gap-space-sm border-2 border-border-dark shadow-[3px_3px_0px_0px_#18181B]" id="soloBadge">
              <span className="material-symbols-outlined text-border-dark text-[20px]">smart_toy</span>
              <span className="font-headline-sm text-headline-sm text-border-dark font-black">SOLO PRACTICE</span>
            </div>
          ) : (
          <div className="bg-tertiary-fixed px-space-md py-1.5 rounded-full flex items-center gap-space-sm border-2 border-border-dark shadow-[3px_3px_0px_0px_#18181B]">
            <span className="font-label-sm text-label-sm text-on-tertiary-fixed tracking-wider font-bold">ROOM ID:</span>
            <span className="font-headline-sm text-headline-sm text-border-dark tracking-widest font-black select-all" id="roomCodeDisplay">
              #{roomData.code || roomData.id}
            </span>
            <button
              aria-label="Copy Room ID"
              className="w-7 h-7 rounded-lg bg-surface-card-subtle flex items-center justify-center hover:bg-surface-variant active:translate-x-[2px] active:translate-y-[2px] transition-all border border-border-dark"
              onClick={handleCopyCode}
              type="button"
            >
              <span className="material-symbols-outlined text-border-dark text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
          )}
          {copied && <span className="font-label-sm text-label-sm text-primary font-bold animate-pulse">Copied to Clipboard!</span>}
        </div>

        {/* Right: Room Name & Host Badge */}
        <div className="flex items-center gap-space-md min-w-0">
          <div className="flex flex-col text-right min-w-0">
            <span className="font-headline-sm text-headline-sm text-border-dark font-black uppercase break-words" id="roomNameDisplay">{roomData.name || 'JUST DRAW IT ARENA'}</span>
            {/* T1-20: the server's own public room has no player host */}
            {!isSolo && (roomData.host === GAME_RULES.PUBLIC_ROOM_HOST
              ? <span className="font-label-sm text-label-sm text-on-surface-variant font-bold" id="publicRoomLabel">PUBLIC ROOM</span>
              : <span className="font-label-sm text-label-sm text-on-surface-variant">HOST: {roomData.host} 👑</span>)}
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Left Controls (7 cols) + Right Roster (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg pt-space-lg">
        {/* LEFT SECTION (Columns 1-7): match settings (T1-14: one view, no tabs) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="w-full bg-surface-card-subtle rounded-xl p-space-md md:p-space-lg border-[3px] border-border-dark shadow-[4px_4px_0px_0px_#18181B] flex flex-col gap-space-md">
            {/* T1-14: one match-settings view — host controls, read-only for guests; mini-challenges only here */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs border-b border-border-dark/30">
                <h3 className="font-headline-sm text-headline-sm text-border-dark uppercase font-black">MATCH SETTINGS</h3>
                <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full border border-border-dark font-bold ${
                  isHost ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-card text-on-surface-variant'
                }`}>
                  {isHost ? '👑 HOST CONTROLS ACTIVE' : 'READ-ONLY GUEST VIEW'}
                </span>
              </div>

              {/* Game Mode Selection */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">1. GAME MODE</span>
                <div className="grid grid-cols-3 gap-space-xs">
                  {[
                    { mode: GAME_MODES.MULTIPLAYER_FFA, label: 'FREE-FOR-ALL', icon: 'groups', color: 'bg-primary-container text-on-primary' },
                    { mode: GAME_MODES.TEAM, label: 'TEAM CLASH', icon: 'diversity_3', color: 'bg-accent-blue text-on-tertiary' },
                    { mode: GAME_MODES.SOLO_AI, label: 'SOLO VS AI', icon: 'smart_toy', color: 'bg-tertiary-fixed text-on-tertiary-fixed' }
                  ].map((item) => {
                    const soloBlocked = item.mode === GAME_MODES.SOLO_AI && othersInRoom;
                    return (
                      <button
                        key={item.mode}
                        disabled={!isHost || soloBlocked}
                        title={soloBlocked ? SOLO_BLOCKED : undefined}
                        className={`flex flex-col items-center justify-center p-space-xs rounded-xl border-2 border-border-dark transition-all text-center ${
                          roomData.gameMode === item.mode ? `${item.color} shadow-[2px_2px_0px_#18181B] font-bold` : 'bg-canvas-paper text-on-surface hover:bg-surface-container'
                        } ${!isHost ? 'cursor-default opacity-90' : soloBlocked ? 'opacity-40 cursor-not-allowed' : 'hover:translate-x-[-1px] hover:translate-y-[-1px]'}`}
                        onClick={() => handleUpdateSetting({ gameMode: item.mode })}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px] mb-0.5">{item.icon}</span>
                        <span className="font-label-sm text-label-sm leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* T1-14: the server refuses Solo while others are here — say why, visibly (the lobby has no chat) */}
                {isHost && othersInRoom && (
                  <p role="status" className="font-body-sm text-body-sm font-bold text-border-dark bg-tertiary-fixed border-2 border-border-dark rounded-lg px-space-sm py-1 flex items-center gap-1.5" id="soloBlockedReason">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                    SOLO VS AI unavailable — {SOLO_BLOCKED}.
                  </p>
                )}
              </div>

              {/* Round Controls & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {/* Round Time Selector */}
                <div className="bg-canvas-paper p-space-sm rounded-xl border-2 border-border-dark flex flex-col justify-between gap-space-xs shadow-sm">
                  <span className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">2. ROUND TIMER</span>
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
                    {[30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        disabled={!isHost}
                        className={`px-2 py-1 rounded-lg font-label-md text-label-md border-2 border-border-dark transition-all ${
                          roomData.roundTime === sec
                            ? 'bg-timer-red text-on-error font-black shadow-[2px_2px_0px_#18181B]'
                            : 'bg-surface-card text-on-surface hover:bg-surface-container'
                        } ${!isHost ? 'cursor-default' : 'hover:scale-105'}`}
                        onClick={() => handleUpdateSetting({ roundTime: sec })}
                        type="button"
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Rounds */}
                <div className="bg-canvas-paper p-space-sm rounded-xl border-2 border-border-dark flex flex-col justify-between gap-space-xs shadow-sm">
                  <span className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">3. TOTAL ROUNDS</span>
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {[3, 5, 7, 10].map((r) => (
                      <button
                        key={r}
                        disabled={!isHost}
                        className={`w-8 h-8 rounded-lg font-headline-sm text-headline-sm border-2 border-border-dark transition-all flex items-center justify-center ${
                          roomData.totalRounds === r
                            ? 'bg-secondary-fixed text-on-secondary-fixed font-black shadow-[2px_2px_0px_#18181B]'
                            : 'bg-surface-card text-on-surface hover:bg-surface-container'
                        } ${!isHost ? 'cursor-default' : 'hover:scale-105'}`}
                        onClick={() => handleUpdateSetting({ totalRounds: r })}
                        type="button"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Word Difficulty (D1) — null = Mixed */}
              <div className="bg-canvas-paper p-space-sm rounded-xl border-2 border-border-dark flex flex-wrap items-center justify-between gap-space-xs shadow-sm">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">4. WORD DIFFICULTY:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[null, WORD_DIFFICULTY.EASY, WORD_DIFFICULTY.MEDIUM, WORD_DIFFICULTY.HARD].map((level) => (
                    <button
                      key={level || 'MIXED'}
                      disabled={!isHost}
                      aria-pressed={(roomData.wordDifficulty || null) === level}
                      className={`px-2.5 py-1 rounded-lg font-label-md text-label-md border-2 border-border-dark transition-all flex items-center justify-center ${
                        (roomData.wordDifficulty || null) === level
                          ? 'bg-primary-container text-on-primary font-black shadow-[2px_2px_0px_#18181B]'
                          : 'bg-surface-card text-on-surface hover:bg-surface-container'
                      } ${!isHost ? 'cursor-default' : 'hover:scale-105'}`}
                      onClick={() => handleUpdateSetting({ wordDifficulty: level })}
                      type="button"
                    >
                      {level || 'MIXED'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Capacity (not for Solo vs AI) */}
              {!isSolo && (
              <div className="bg-canvas-paper p-space-sm rounded-xl border-2 border-border-dark flex items-center justify-between shadow-sm">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant font-bold">5. MAX PLAYERS:</span>
                <div className="flex items-center gap-1">
                  {[4, 8, 10, 12, 16].map((cap) => (
                    <button
                      key={cap}
                      disabled={!isHost}
                      className={`px-2.5 py-1 rounded-lg font-label-md text-label-md border-2 border-border-dark transition-all flex items-center justify-center ${
                        roomData.maxPlayers === cap
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed font-black shadow-[2px_2px_0px_#18181B]'
                          : 'bg-surface-card text-on-surface hover:bg-surface-container'
                      } ${!isHost ? 'cursor-default' : 'hover:scale-105'}`}
                      onClick={() => handleUpdateSetting({ maxPlayers: cap })}
                      type="button"
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Mini-challenges (the only place to turn them on / off) */}
              <div className="flex flex-col gap-space-md pt-space-xs">
                {/* T1-12: clear heading + one-line explanation for new players */}
                <div className="flex flex-col gap-1 pb-space-xs border-b border-border-dark/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-headline-sm text-headline-sm text-border-dark uppercase tracking-wider flex items-center gap-1.5 font-black" id="miniChallengeHeading">
                      <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden="true">casino</span>
                      MINI-CHALLENGES
                    </h3>
                    <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full border border-border-dark font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                      {enabledChallenges.length} / {Object.keys(CHALLENGE_DETAILS).length} ACTIVE
                    </span>
                  </div>
                  <p className="font-thai-safe text-body-sm text-on-surface-variant" id="miniChallengeHelp">
                    Each turn, one enabled challenge is picked at random and adds a drawing rule for the drawer.
                  </p>
                </div>

                {isHost && (
                  <div className="font-thai-safe bg-canvas-paper/70 p-2 rounded-lg border border-border-dark/40 text-xs font-bold text-border-dark flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
                    {isSolo ? 'Click a mini-challenge card to turn it ON or OFF.' : 'Host: Click any mini-challenge card below to turn it ON or OFF!'}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  {Object.entries(CHALLENGE_DETAILS).map(([key, val]) => {
                    const isEnabled = enabledChallenges.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => isHost && handleToggleChallenge(key)}
                        className={`p-space-sm bg-canvas-paper rounded-lg border-2 border-border-dark shadow-[3px_3px_0px_0px_#18181B] flex flex-col justify-start gap-space-sm transition-all ${
                          isHost ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : ''
                        } ${!isEnabled ? 'opacity-50 grayscale[30%]' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className={`w-9 h-9 rounded-lg border border-border-dark flex items-center justify-center ${isEnabled ? 'bg-tertiary-fixed' : 'bg-surface-container'}`}>
                            <span className="material-symbols-outlined text-border-dark text-[22px]">
                              {key === 'COLOUR_FIX' ? 'palette' : key === 'DONT_LIFT_PEN' ? 'gesture' : key === 'GEOMETRIC_ONLY' ? 'shapes' : 'draw'}
                            </span>
                          </div>
                          <span
                            className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full tracking-wider border border-border-dark font-bold flex items-center gap-1 ${
                              isEnabled ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-slot-empty text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isEnabled ? 'check_circle' : 'cancel'}
                            </span>
                            {isEnabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-thai-safe text-body-md text-border-dark uppercase font-black">{val.name}</h4>
                          <p className="font-thai-safe text-body-sm text-on-surface-variant mt-0.5">{val.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION (Columns 8-12): Player Roster */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="bg-canvas-paper rounded-xl p-space-md border-[3px] border-border-dark shadow-[4px_4px_0px_0px_#18181B] flex flex-col gap-space-md">
            {isSolo ? (
              <div className="flex flex-col gap-space-xs pb-space-xs border-b-2 border-border-dark" id="soloPanel">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">smart_toy</span>
                  <h3 className="font-headline-sm text-headline-sm uppercase text-border-dark font-black">SOLO VS AI</h3>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Single player: you draw, the AI guesses. No Ready step.</p>
                <ul className="font-body-sm text-body-sm text-border-dark flex flex-wrap gap-x-space-md gap-y-1" id="soloSummary">
                  <li><strong>{roomData.totalRounds}</strong> rounds</li>
                  <li><strong>{roomData.roundTime}s</strong> per drawing</li>
                  <li>Words: <strong>{roomData.wordDifficulty || 'MIXED'}</strong></li>
                  <li><strong>{enabledChallenges.length}</strong> mini-challenge(s)</li>
                </ul>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Change these in MATCH SETTINGS.</p>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between pb-space-xs border-b-2 border-border-dark">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[22px]">group</span>
                <h3 className="font-headline-sm text-headline-sm uppercase text-border-dark font-black">PLAYER ROSTER</h3>
              </div>
              <span className="font-label-md text-label-md bg-tertiary-fixed border border-border-dark px-2 py-0.5 rounded-full font-bold">
                {roomData.players.length} / {roomData.maxPlayers}
              </span>
            </div>

            {/* T1-15: pick your team in a Team lobby (switch_team, server allows it in LOBBY only) */}
            {isTeamMode && (
              <div className="grid grid-cols-2 gap-space-xs" id="teamPicker">
                {['Red', 'Blue'].map((t) => {
                  const mine = myTeam === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={mine}
                      disabled={mine}
                      onClick={() => socket.emit(SOCKET_EVENTS.SWITCH_TEAM, { team: t })}
                      className={`py-space-xs rounded-xl border-2 border-border-dark font-label-md text-label-md uppercase font-black transition-all ${
                        t === 'Red' ? 'bg-timer-red text-on-error' : 'bg-accent-blue text-on-tertiary'
                      } ${mine ? 'ring-4 ring-border-dark/40 cursor-default' : 'opacity-80 hover:opacity-100 shadow-[2px_2px_0px_#18181B]'}`}
                    >
                      {mine ? `✓ TEAM ${t.toUpperCase()}` : `JOIN ${t.toUpperCase()}`} ({t === 'Red' ? redCount : blueCount})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-space-xs">
              {roomData.players.map((p) => {
                const isMe = p.username === username;
                const isRoomHost = p.username === roomData.host;

                return (
                  <div
                    key={p.username}
                    className={`flex items-center justify-between p-space-sm rounded-xl border-2 border-border-dark transition-all ${
                      isMe ? 'bg-secondary-fixed shadow-[3px_3px_0px_#18181B]' : 'bg-surface-card shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-border-dark flex items-center justify-center text-xl shadow-sm">
                        {p.avatar || '🐶'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="font-headline-sm text-headline-sm text-border-dark font-bold">{p.username}</span>
                          {isMe && <span className="bg-primary text-on-primary font-label-sm text-[10px] px-1.5 py-0.2 rounded font-bold uppercase">ME</span>}
                          {isRoomHost && <span className="text-xl" title="Room Host">👑</span>}
                          {isTeamMode && (
                            <span className={`font-label-sm text-[10px] px-1.5 rounded font-bold uppercase border border-border-dark ${p.team === 'Red' ? 'bg-timer-red text-on-error' : 'bg-accent-blue text-on-tertiary'}`}>
                              {p.team}
                            </span>
                          )}
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Score: {p.score} pts</span>
                      </div>
                    </div>

                    {/* T1-08: the host starts the game and never needs to be ready */}
                    <span
                      className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-border-dark font-bold ${
                        isRoomHost ? 'bg-tertiary-fixed text-on-tertiary-fixed' : p.isReady ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-slot-empty text-on-surface-variant'
                      }`}
                    >
                      {isRoomHost ? 'HOST' : p.isReady ? 'READY' : 'WAITING'}
                    </span>
                  </div>
                );
              })}
            </div>
            </>
            )}

            <div className="flex flex-col gap-space-xs pt-space-xs">
              {!isSolo && !isHost && (
              <button
                id="readyButton"
                aria-pressed={!!meReady}
                className={`w-full py-space-md rounded-xl font-headline-md text-headline-md uppercase border-[3px] border-border-dark shadow-[4px_4px_0px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all ${
                  meReady ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                }`}
                onClick={handleToggleReady}
                type="button"
              >
                {meReady ? "✓ READY — TAP TO CANCEL" : "I'M READY"}
              </button>
              )}
              {!isSolo && !isHost && (
                <p className="font-body-sm text-body-sm text-on-surface-variant text-center" id="waitingForHost">
                  {meReady ? `Waiting for ${roomData.host} to start the game` : 'Press READY so the host can start'}
                </p>
              )}
              {isHost && (
                <button
                  className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase border-[3px] border-border-dark shadow-[4px_4px_0px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
                  onClick={handleStartGame}
                  disabled={!!startBlockReason}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                  {isSolo ? 'START SOLO' : 'START GAME'}
                </button>
              )}
              {isHost && startBlockReason && (
                <p className="font-body-sm text-body-sm text-on-surface-variant text-center">{startBlockReason}</p>
              )}
            </div>
          </div>

          {/* T1-13: lobby chat under the roster (not in Solo: single player) */}
          {!isSolo && <ChatBox username={username} isDrawer={false} roomStatus={roomData.status} variant="lobby" />}
        </div>
      </div>
    </div>
  );
}
