import React, { useState, useEffect } from 'react';
import RoomList from './components/RoomList';
import Leaderboard from './components/Leaderboard';
import MultiplayerGame from './gameModes/MultiplayerGame';
import TeamGame from './gameModes/TeamGame';
import SoloAIGame from './gameModes/SoloAIGame';
import { socket, connectSocket } from './services/socket';
import { SOCKET_EVENTS } from '../../shared/events';
import { GAME_MODES, AVATARS } from '../../shared/gameConfig';
import './index.css';

export default function App() {
  const [username, setUsername] = useState(localStorage.getItem('game_username') || 'กกก');
  const [avatar, setAvatar] = useState(localStorage.getItem('game_avatar') || '🐼');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('game_username'));

  const [modeTab, setModeTab] = useState('create'); // 'create' | 'join'
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pin3, setPin3] = useState('');
  const [pin4, setPin4] = useState('');
  const [pin5, setPin5] = useState('');

  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [wordOptions, setWordOptions] = useState([]);
  const [activeNav, setActiveNav] = useState('lobby'); // 'lobby' | 'leaderboard'
  const [soundMuted, setSoundMuted] = useState(false);
  const [gameOverModal, setGameOverModal] = useState(null);

  // New room parameters
  const [newRoomName, setNewRoomName] = useState('');
  const [gameMode, setGameMode] = useState(GAME_MODES.MULTIPLAYER_FFA);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roundTime, setRoundTime] = useState(60);

  useEffect(() => {
    connectSocket();

    const handleRoomData = (data) => {
      setRoomData(data);
    };

    const handleWordSelection = ({ words }) => {
      setWordOptions(words);
    };

    const handleGameOver = (data) => {
      setGameOverModal(data);
    };

    socket.on(SOCKET_EVENTS.ROOM_DATA, handleRoomData);
    socket.on(SOCKET_EVENTS.WORD_SELECTION, handleWordSelection);
    socket.on(SOCKET_EVENTS.GAME_OVER, handleGameOver);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_DATA, handleRoomData);
      socket.off(SOCKET_EVENTS.WORD_SELECTION, handleWordSelection);
      socket.off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
    };
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    localStorage.setItem('game_username', username.trim());
    localStorage.setItem('game_avatar', avatar);
    setIsLoggedIn(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), avatar })
    });
  };

  const handleJoinByPin = (e) => {
    e.preventDefault();
    const fullPin = `${pin1}${pin2}${pin3}${pin4}${pin5}`.trim();
    if (fullPin.length < 5) {
      alert('Please enter a 5-digit room code!');
      return;
    }

    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { code: fullPin, username, avatar }, (res) => {
      if (res && res.success) {
        setCurrentRoomId(res.roomId);
      } else {
        alert(res?.message || 'Failed to join room!');
      }
    });
  };

  const handleCreateRoom = (e) => {
    if (e) e.preventDefault();
    const config = {
      name: newRoomName.trim() || `${username}'s Room`,
      username,
      avatar,
      gameMode,
      maxPlayers,
      roundTime,
      miniChallengeEnabled: true
    };

    socket.emit(SOCKET_EVENTS.CREATE_ROOM, config, (res) => {
      if (res && res.success) {
        setCurrentRoomId(res.roomId);
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit(SOCKET_EVENTS.LEAVE_ROOM);
    setCurrentRoomId(null);
    setRoomData(null);
    setGameOverModal(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-arcade-dots min-h-screen flex items-center justify-center p-space-md">
        <div className="bg-canvas-paper border-4 border-border-dark shadow-[8px_8px_0px_#18181B] rounded-xl p-space-lg w-full max-w-[440px] text-center flex flex-col gap-space-md">
          <div className="flex items-center justify-center gap-space-xs mb-2">
            <span className="material-symbols-outlined text-primary text-[32px]">draw</span>
            <span className="font-headline-lg text-headline-lg uppercase text-border-dark font-black tracking-wide">
              JUST DRAW IT
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Multiplayer Arcade Sketch & Guessing Game</p>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-space-md text-left">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md uppercase text-on-surface-variant" htmlFor="nickname">
                CHOOSE YOUR NICKNAME
              </label>
              <input
                id="nickname"
                type="text"
                maxLength="14"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER NAME..."
                className="w-full bg-surface-card text-on-surface font-headline-md text-headline-md px-space-md py-space-sm rounded-xl border-2 border-border-dark focus:outline-none focus:ring-2 focus:ring-secondary-container"
                required
              />
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider">
                SELECT AVATAR CHARACTER:
              </span>
              <div className="flex items-center justify-between gap-space-xs pt-1">
                {AVATARS.slice(0, 6).map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    className={`w-12 h-12 rounded-full border-2 border-border-dark flex items-center justify-center transition-all ${
                      avatar === av.emoji
                        ? 'bg-secondary-fixed ring-4 ring-secondary shadow-md scale-110'
                        : 'bg-surface-card hover:bg-surface-container shadow-sm'
                    }`}
                    onClick={() => setAvatar(av.emoji)}
                  >
                    <span className="text-2xl select-none">{av.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase tracking-wider border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-space-sm mt-2"
            >
              <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
              PLAY NOW
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-arcade-dots text-on-surface font-body-md min-h-screen flex flex-col">
      {/* Header Bar matching stitch_game_ui_design_system */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-canvas-paper border-b-2 border-border-dark shadow-[0_4px_0_0_#18181B]">
        <div className="h-20 max-w-[1120px] mx-auto px-gutter flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <a
              className="flex items-center gap-space-sm bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-xs rounded-xl border-2 border-border-dark shadow-[3px_3px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              href="#"
              onClick={() => { setActiveNav('lobby'); setCurrentRoomId(null); }}
            >
              <span className="material-symbols-outlined text-border-dark text-[24px]">draw</span>
              <span className="font-headline-sm text-headline-sm uppercase tracking-wide">JUST DRAW IT</span>
            </a>
            <div className="hidden lg:flex items-center gap-space-xs bg-surface-card px-space-sm py-space-xs rounded-full border-2 border-border-dark shadow-[2px_2px_0px_#18181B]">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse"></span>
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant font-bold">
                ROOM: #{roomData ? roomData.code || roomData.id : 'ARCADE-99'}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-space-sm">
            {!currentRoomId && (
              <>
                <button
                  className={`px-space-md py-space-xs rounded-lg transition-all border-2 ${
                    activeNav === 'lobby'
                      ? 'bg-secondary-fixed text-on-secondary-fixed font-bold border-border-dark shadow-[2px_2px_0px_#18181B]'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                  onClick={() => setActiveNav('lobby')}
                >
                  FIND ROOM & LOBBY
                </button>
                <button
                  className={`px-space-md py-space-xs rounded-lg transition-all border-2 ${
                    activeNav === 'leaderboard'
                      ? 'bg-secondary-fixed text-on-secondary-fixed font-bold border-border-dark shadow-[2px_2px_0px_#18181B]'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                  onClick={() => setActiveNav('leaderboard')}
                >
                  LEADERBOARD
                </button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-space-sm">
            <button
              aria-label="Toggle Audio Mute"
              className="w-10 h-10 flex items-center justify-center bg-surface-card rounded-xl border-2 border-border-dark shadow-[3px_3px_0px_#18181B] hover:bg-surface-container-high active:translate-x-[2px] active:translate-y-[2px] transition-all"
              onClick={() => setSoundMuted(!soundMuted)}
              type="button"
            >
              <span className="material-symbols-outlined text-border-dark text-[20px]">
                {soundMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
            <div className="flex items-center gap-2 bg-surface-card px-space-sm py-1 rounded-xl border-2 border-border-dark shadow-[2px_2px_0px_#18181B]">
              <span className="text-xl">{avatar}</span>
              <span className="font-headline-sm text-label-md text-border-dark font-bold">{username}</span>
            </div>
            {currentRoomId && (
              <button
                className="px-space-sm py-1 rounded-lg bg-timer-red text-on-error font-headline-sm text-label-sm border-2 border-border-dark shadow-[2px_2px_0px_#18181B] hover:opacity-90 transition-all"
                onClick={handleLeaveRoom}
              >
                LEAVE
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full pt-20 flex-1">
        <div className="max-w-[1120px] mx-auto px-gutter py-margin">
          {!currentRoomId ? (
            activeNav === 'lobby' ? (
              <div className="flex flex-col w-full">
                {/* Top Ticker Bar */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container px-space-lg py-space-sm rounded-xl border-2 border-border-dark shadow-[4px_4px_0px_#18181B] mb-space-lg">
                  <div className="flex items-center gap-space-sm">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-container text-on-primary border border-border-dark">
                      <span className="material-symbols-outlined text-[18px]">videogame_asset</span>
                    </span>
                    <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface">ARCADE LOBBY NETWORK</span>
                    <span className="px-space-sm py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm border border-border-dark font-bold">LIVE SEASON 04</span>
                  </div>
                  <div className="flex items-center gap-space-lg">
                    <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                      <span className="font-bold text-on-surface">1,420 PLAYERS ONLINE</span>
                    </div>
                  </div>
                </div>

                {/* Main Split Architecture Bento Stage */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
                  {/* LEFT PANEL: Player Persona & Room Setup (5 Cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-space-lg">
                    <div className="bg-canvas-paper rounded-xl border-4 border-border-dark shadow-[6px_6px_0px_#18181B] p-space-lg flex flex-col gap-space-lg relative overflow-hidden">
                      {/* Tab Mode Switcher */}
                      <div className="grid grid-cols-2 gap-space-xs bg-surface-card-subtle p-1.5 rounded-xl border-2 border-border-dark">
                        <button
                          className={`py-space-sm px-space-md rounded-lg font-headline-sm text-headline-sm uppercase transition-all flex items-center justify-center gap-space-xs border-2 ${
                            modeTab === 'create'
                              ? 'bg-canvas-paper text-on-surface border-border-dark shadow-[2px_2px_0px_#18181B]'
                              : 'border-transparent text-on-surface-variant hover:text-on-surface'
                          }`}
                          onClick={() => setModeTab('create')}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
                          CREATE ROOM
                        </button>
                        <button
                          className={`py-space-sm px-space-md rounded-lg font-headline-sm text-headline-sm uppercase transition-all flex items-center justify-center gap-space-xs border-2 ${
                            modeTab === 'join'
                              ? 'bg-canvas-paper text-on-surface border-border-dark shadow-[2px_2px_0px_#18181B]'
                              : 'border-transparent text-on-surface-variant hover:text-on-surface'
                          }`}
                          onClick={() => setModeTab('join')}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">login</span>
                          JOIN GAME
                        </button>
                      </div>

                      {/* Identity Profile Station */}
                      <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-md border-2 border-border-dark">
                        <div className="flex items-center justify-between">
                          <span className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface font-bold">1. PLAYER IDENTITY</span>
                          <span className="font-label-sm text-label-sm text-primary font-bold">READY TO PLAY</span>
                        </div>
                        <div className="flex items-center gap-space-md">
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-secondary-fixed border-3 border-border-dark flex items-center justify-center shadow-[3px_3px_0px_#18181B] relative shrink-0">
                            <span className="text-4xl select-none">{avatar}</span>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <label className="font-label-md text-label-md uppercase text-on-surface-variant mb-1" htmlFor="player-name-input">
                              CHOOSE YOUR NICKNAME
                            </label>
                            <input
                              className="w-full bg-canvas-paper text-on-surface font-headline-md text-headline-md px-space-md py-space-sm rounded-xl border-2 border-border-dark focus:outline-none focus:ring-2 focus:ring-secondary-container shadow-inner"
                              id="player-name-input"
                              maxLength="14"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="ENTER NAME..."
                              type="text"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-space-xs">
                          <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider">SELECT AVATAR:</span>
                          <div className="flex items-center justify-between gap-space-xs pt-1">
                            {AVATARS.slice(0, 6).map((av) => (
                              <button
                                key={av.id}
                                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-border-dark transition-all flex items-center justify-center ${
                                  avatar === av.emoji
                                    ? 'bg-secondary-fixed ring-4 ring-secondary shadow-md scale-105'
                                    : 'bg-surface-card hover:bg-surface-container-high shadow-sm'
                                }`}
                                onClick={() => setAvatar(av.emoji)}
                                type="button"
                              >
                                <span className="text-2xl select-none">{av.emoji}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Panel: CREATE MODE */}
                      {modeTab === 'create' ? (
                        <div className="flex flex-col gap-space-md">
                          <div className="flex items-center justify-between">
                            <span className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface font-bold">2. MATCH CONFIGURATION</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">HOST CONTROLS</span>
                          </div>

                          <div className="flex flex-col gap-space-xs">
                            <span className="font-label-md text-label-md uppercase text-on-surface-variant">GAME MODE</span>
                            <div className="grid grid-cols-3 gap-space-xs">
                              <button
                                className={`flex flex-col items-center justify-center p-space-sm rounded-xl border-2 border-border-dark transition-all text-center ${
                                  gameMode === GAME_MODES.MULTIPLAYER_FFA ? 'bg-primary-container text-on-primary shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card text-on-surface hover:bg-surface-container'
                                }`}
                                onClick={() => setGameMode(GAME_MODES.MULTIPLAYER_FFA)}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[20px] mb-1">groups</span>
                                <span className="font-label-sm text-label-sm leading-tight">FREE-FOR-ALL</span>
                              </button>
                              <button
                                className={`flex flex-col items-center justify-center p-space-sm rounded-xl border-2 border-border-dark transition-all text-center ${
                                  gameMode === GAME_MODES.TEAM ? 'bg-accent-blue text-on-tertiary shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card text-on-surface hover:bg-surface-container'
                                }`}
                                onClick={() => setGameMode(GAME_MODES.TEAM)}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[20px] mb-1">diversity_3</span>
                                <span className="font-label-sm text-label-sm leading-tight">TEAM CLASH</span>
                              </button>
                              <button
                                className={`flex flex-col items-center justify-center p-space-sm rounded-xl border-2 border-border-dark transition-all text-center ${
                                  gameMode === GAME_MODES.SOLO_AI ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card text-on-surface hover:bg-surface-container'
                                }`}
                                onClick={() => setGameMode(GAME_MODES.SOLO_AI)}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[20px] mb-1">smart_toy</span>
                                <span className="font-label-sm text-label-sm leading-tight">SOLO VS AI</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-space-md bg-surface-card-subtle p-space-md rounded-xl border-2 border-border-dark">
                            <div className="flex flex-col gap-1">
                              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">MAX PLAYERS</span>
                              <div className="flex items-center gap-space-sm">
                                <button
                                  className="w-8 h-8 rounded-lg bg-surface border-2 border-border-dark flex items-center justify-center font-headline-sm text-headline-sm shadow-sm"
                                  onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                                  type="button"
                                >
                                  -
                                </button>
                                <span className="font-headline-md text-headline-md text-on-surface px-1">{maxPlayers}</span>
                                <button
                                  className="w-8 h-8 rounded-lg bg-surface border-2 border-border-dark flex items-center justify-center font-headline-sm text-headline-sm shadow-sm"
                                  onClick={() => setMaxPlayers(Math.min(16, maxPlayers + 1))}
                                  type="button"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">ROUND TIMER</span>
                              <div className="flex items-center gap-space-xs">
                                <span className="px-space-sm py-1 rounded-lg bg-surface font-headline-sm text-headline-sm text-timer-red shadow-sm border border-border-dark">
                                  {roundTime} SEC
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase tracking-wider border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-space-sm"
                            onClick={handleCreateRoom}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[24px]">palette</span>
                            CREATE PRIVATE ROOM
                          </button>
                        </div>
                      ) : (
                        /* Interactive Panel: JOIN PIN MODE */
                        <form onSubmit={handleJoinByPin} className="flex flex-col gap-space-md">
                          <div className="flex items-center justify-between">
                            <span className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface font-bold">2. ENTER 5-DIGIT ROOM CODE</span>
                            <span className="font-label-sm text-label-sm text-accent-blue font-bold">INVITE ONLY</span>
                          </div>

                          <div className="flex justify-between gap-space-xs sm:gap-space-sm">
                            <input
                              className="pin-box w-12 h-14 sm:w-14 sm:h-16 text-center text-headline-xl font-headline-xl uppercase bg-surface-card text-on-surface rounded-xl border-3 border-border-dark shadow-md focus:bg-canvas-paper focus:ring-2 focus:ring-secondary-container outline-none"
                              maxLength="1"
                              type="text"
                              value={pin1}
                              onChange={(e) => setPin1(e.target.value.toUpperCase())}
                              placeholder="8"
                            />
                            <input
                              className="pin-box w-12 h-14 sm:w-14 sm:h-16 text-center text-headline-xl font-headline-xl uppercase bg-surface-card text-on-surface rounded-xl border-3 border-border-dark shadow-md focus:bg-canvas-paper focus:ring-2 focus:ring-secondary-container outline-none"
                              maxLength="1"
                              type="text"
                              value={pin2}
                              onChange={(e) => setPin2(e.target.value.toUpperCase())}
                              placeholder="3"
                            />
                            <input
                              className="pin-box w-12 h-14 sm:w-14 sm:h-16 text-center text-headline-xl font-headline-xl uppercase bg-surface-card text-on-surface rounded-xl border-3 border-border-dark shadow-md focus:bg-canvas-paper focus:ring-2 focus:ring-secondary-container outline-none"
                              maxLength="1"
                              type="text"
                              value={pin3}
                              onChange={(e) => setPin3(e.target.value.toUpperCase())}
                              placeholder="9"
                            />
                            <input
                              className="pin-box w-12 h-14 sm:w-14 sm:h-16 text-center text-headline-xl font-headline-xl uppercase bg-surface-card text-on-surface rounded-xl border-3 border-border-dark shadow-md focus:bg-canvas-paper focus:ring-2 focus:ring-secondary-container outline-none"
                              maxLength="1"
                              type="text"
                              value={pin4}
                              onChange={(e) => setPin4(e.target.value.toUpperCase())}
                              placeholder="2"
                            />
                            <input
                              className="pin-box w-12 h-14 sm:w-14 sm:h-16 text-center text-headline-xl font-headline-xl uppercase bg-surface-card text-on-surface rounded-xl border-3 border-border-dark shadow-md focus:bg-canvas-paper focus:ring-2 focus:ring-secondary-container outline-none"
                              maxLength="1"
                              type="text"
                              value={pin5}
                              onChange={(e) => setPin5(e.target.value.toUpperCase())}
                              placeholder="1"
                            />
                          </div>

                          <button
                            className="w-full py-space-md rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-headline-md text-headline-md uppercase tracking-wider border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-space-sm"
                            type="submit"
                          >
                            <span className="material-symbols-outlined text-[24px]">login</span>
                            JOIN MATCH NOW
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANEL: Public Room Browser (7 Cols) */}
                  <div className="lg:col-span-7 flex flex-col gap-space-lg">
                    <RoomList username={username} avatar={avatar} onJoinRoom={(id) => setCurrentRoomId(id)} />
                  </div>
                </div>
              </div>
            ) : (
              <Leaderboard />
            )
          ) : roomData ? (
            roomData.gameMode === GAME_MODES.TEAM ? (
              <TeamGame roomData={roomData} username={username} wordOptions={wordOptions} />
            ) : roomData.gameMode === GAME_MODES.SOLO_AI ? (
              <SoloAIGame roomData={roomData} username={username} />
            ) : (
              <MultiplayerGame roomData={roomData} username={username} wordOptions={wordOptions} />
            )
          ) : (
            <div className="p-space-xl text-center font-headline-lg text-headline-lg text-on-surface">Connecting to Room...</div>
          )}
        </div>
      </main>

      {/* Match Over Summary Modal */}
      {gameOverModal && (
        <div className="fixed inset-0 z-50 bg-border-dark/80 flex items-center justify-center p-space-md">
          <div className="bg-canvas-paper border-4 border-border-dark shadow-[8px_8px_0px_#18181B] rounded-2xl p-space-xl max-w-[500px] w-full text-center flex flex-col gap-space-md">
            <h2 className="font-headline-xl text-headline-xl uppercase text-border-dark">🏆 MATCH RESULTS</h2>
            <h3 className="font-headline-md text-headline-md text-primary-container font-black">{gameOverModal.winnerText}</h3>

            <div className="bg-surface-card p-space-md rounded-xl border-2 border-border-dark text-left flex flex-col gap-2">
              <h4 className="font-headline-sm text-headline-sm text-border-dark uppercase">FINAL STANDINGS</h4>
              <ul className="flex flex-col gap-1">
                {gameOverModal.finalScores.map((p, idx) => (
                  <li key={p.username} className="flex justify-between items-center p-space-xs rounded bg-surface-container border border-border-dark">
                    <span>{p.avatar || '🐶'} #{idx + 1} {p.username}</span>
                    <span className="font-bold">{p.score} PTS</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:opacity-90 transition-all"
              onClick={() => setGameOverModal(null)}
            >
              BACK TO LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
