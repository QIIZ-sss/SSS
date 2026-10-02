import React, { useState, useEffect, useRef } from 'react';
import Canvas from '../components/Canvas';
import ChallengeOverlay, { ChallengeTurnPopup } from '../components/ChallengeOverlay';
import RoomLobby from '../components/RoomLobby';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';
import { GAME_STATUS, SOLO_AI } from '../../../shared/contract';
import { canvasToPixels } from '../utils/canvasToPixels';

// A8: the server owns the target word (room_data.currentWord — the solo player is the drawer, so it is sent to them).
// The client never picks or infers a word; it echoes the server's word with each prediction request.
const EMPTY_PREDICTION = { ready: true, guess: null, confidence: 0, isConfident: false, top3: [], modelSees: null, isCorrect: false };

export default function SoloAIGame({ roomData, username }) {
  const [prediction, setPrediction] = useState(EMPTY_PREDICTION);
  const targetWord = roomData?.currentWord || '';
  const isPlaying = roomData?.status === GAME_STATUS.PLAYING;
  const me = roomData?.players?.find((p) => p.username === username);
  const score = me ? me.score : 0;

  const targetRef = useRef(targetWord);
  const playingRef = useRef(isPlaying);
  targetRef.current = targetWord;
  playingRef.current = isPlaying;

  // New turn (new server word) → clear the previous AI result
  useEffect(() => {
    setPrediction(EMPTY_PREDICTION);
  }, [targetWord, roomData?.currentRound]);

  // 1. AI results from the server (DoodleNet 345); results for another word are ignored
  useEffect(() => {
    const handleAiPrediction = (data) => {
      if (!data || data.targetWord !== targetRef.current) return;
      setPrediction({ ...EMPTY_PREDICTION, ...data });
    };
    socket.on(SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT, handleAiPrediction);
    return () => {
      socket.off(SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT, handleAiPrediction);
    };
  }, []);

  // 2. Sample the drawing every PREDICT_INTERVAL_MS while the turn is PLAYING and send { targetWord, pixels }
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!playingRef.current || !targetRef.current) return;
      const canvas = document.querySelectorAll('canvas')[0];
      if (!canvas) return;

      const pixels = canvasToPixels(canvas);
      if (!pixels || pixels.length !== SOLO_AI.PIXEL_COUNT) return;

      if (pixels.some((v) => v > 0.05)) {
        socket.emit(SOCKET_EVENTS.SOLO_AI_PREDICT, { targetWord: targetRef.current, pixels });
      }
    }, SOLO_AI.PREDICT_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  if (roomData?.status === 'LOBBY') {
    return <RoomLobby roomData={roomData} username={username} />;
  }

  const confidence = Math.min(100, Math.max(0, Math.round(prediction.confidence || 0)));
  // A9: never show a word name unless the model is confident
  const guessText = !prediction.ready
    ? 'AI model is loading…'
    : !prediction.guess
      ? 'Waiting for strokes...'
      : prediction.isConfident ? prediction.guess : 'Not sure yet…';
  const showDetails = prediction.ready && prediction.guess && prediction.isConfident;
  const isSuccessFlash = prediction.isCorrect;

  return (
    <section className="w-full flex flex-col gap-space-md" aria-label="Solo versus AI practice arena">
      {/* Header Bar */}
      <header className="bg-canvas-paper rounded-xl p-space-md border-4 border-border-dark shadow-[6px_6px_0px_#18181B] grid grid-cols-1 md:grid-cols-[1fr_auto] gap-space-md items-center">
        <div className="min-w-0 flex items-center gap-space-sm">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-secondary-fixed border-2 border-border-dark shadow-[2px_2px_0px_#18181B] flex items-center justify-center">
            <span className="material-symbols-outlined text-[25px] text-on-secondary-fixed">smart_toy</span>
          </div>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-primary uppercase font-bold">Solo Mode · DoodleNet 345 CNN</p>
            <h1 className="font-headline-md text-headline-md text-border-dark uppercase font-black">Solo with AI</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Draw clearly. The AI evaluates 784 pixel inputs every 1 second in real time.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-space-xs w-full md:w-auto">
          <div className="bg-tertiary-fixed border-2 border-border-dark rounded-xl px-space-sm py-space-xs text-center min-w-0">
            <span className="font-label-sm text-label-sm text-on-tertiary-fixed block uppercase">Target Word</span>
            <span className="font-headline-sm text-headline-sm text-border-dark uppercase truncate block font-black">{targetWord || '…'}</span>
          </div>
          <div className="bg-surface-card border-2 border-border-dark rounded-xl px-space-sm py-space-xs text-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase">Round</span>
            <span className="font-headline-sm text-headline-sm text-secondary font-black">{roomData?.currentRound} / {roomData?.totalRounds}</span>
          </div>
          <div className="bg-primary-container text-on-primary border-2 border-border-dark rounded-xl px-space-sm py-space-xs text-center shadow-[2px_2px_0px_#18181B]">
            <span className="font-label-sm text-label-sm text-on-primary block uppercase">Score</span>
            <span className="font-headline-sm text-headline-sm text-on-primary font-black">{score}</span>
          </div>
        </div>
      </header>

      <ChallengeTurnPopup roomData={roomData} username={username} />
      <ChallengeOverlay challenge={roomData?.currentChallenge} forcedColor={roomData?.forcedColor} />

      {/* Main Game Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Drawing Desk */}
        <main className="lg:col-span-8 min-w-0 bg-canvas-paper rounded-xl p-space-sm md:p-space-md border-3 border-border-dark shadow-[4px_4px_0px_#18181B]">
          <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-sm mb-space-sm border-b-2 border-border-dark">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">brush</span>
              <h2 className="font-headline-sm text-headline-sm text-border-dark uppercase font-black">Drawing desk</h2>
            </div>
            <div className="flex items-center gap-2">
              {isSuccessFlash && (
                <span className="bg-secondary text-on-secondary px-3 py-1 rounded-full font-headline-sm text-label-sm font-black uppercase animate-bounce shadow-md">
                  🎉 AI GUESSED CORRECTLY! +{SOLO_AI.CORRECT_SCORE}
                </span>
              )}
              <span className="font-label-sm text-label-sm bg-surface-container px-space-sm py-1 rounded-full border border-border-dark text-on-surface-variant uppercase font-bold">
                Target: {targetWord || '…'}
              </span>
            </div>
          </div>
          <div className="flex justify-center min-w-0">
            <Canvas isDrawer={true} challenge={roomData?.currentChallenge} forcedColor={roomData?.forcedColor} />
          </div>
        </main>

        {/* AI Guesser Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-canvas-paper rounded-xl p-space-md border-3 border-border-dark shadow-[4px_4px_0px_#18181B] flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-space-sm pb-space-xs border-b-2 border-border-dark">
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-secondary-fixed border-2 border-border-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-on-secondary-fixed">psychology</span>
                </span>
                <h2 className="font-headline-sm text-headline-sm text-border-dark uppercase font-black">AI Guesser</h2>
              </div>
              <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed border border-border-dark px-2 py-0.5 rounded-full font-bold animate-pulse">
                1 FPS LIVE
              </span>
            </div>

            {/* Current Guess Display */}
            <div className={`p-space-md rounded-xl border-3 border-border-dark text-center transition-all ${
              isSuccessFlash ? 'bg-secondary-fixed scale-105' : 'bg-surface-card-subtle'
            }`}>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold block">Current Guess</span>
              <p className="font-headline-md text-headline-md text-secondary font-black break-words mt-space-xs">
                {guessText}
              </p>
              {/* Out of 345 doodle types... */}
              {showDetails && prediction.modelSees && (
                <div className="mt-space-sm pt-space-xs border-t border-border-dark/20 text-center">
                  <p className="font-label-xs text-label-xs text-on-surface-variant font-medium">
                    Out of 345 doodle types:
                  </p>
                  <p className="font-label-sm text-label-sm font-black text-on-surface uppercase truncate mt-0.5">
                    "{prediction.modelSees.label}" <span className="text-primary font-bold">({prediction.modelSees.confidence}%)</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confidence Bar (Game Share) */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between font-label-md text-label-md text-on-surface font-bold">
                <span>GAME WORD SHARE</span>
                <span className="text-primary font-black">{confidence}%</span>
              </div>
              <div className="w-full h-4 bg-slot-empty rounded-full border border-border-dark overflow-hidden p-0.5" aria-label={`AI confidence ${confidence}%`}>
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, confidence)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-label-xs text-on-surface-variant font-medium px-1">
                <span>Threshold: &ge; {Math.round(SOLO_AI.MIN_GAME_SHARE * 100)}%</span>
                <span>{prediction.isConfident ? 'Confident' : 'Not sure yet'} (raw &ge; {Math.round(SOLO_AI.MIN_RAW_PROB * 100)}%)</span>
              </div>
            </div>

            {/* Top Guesses List */}
            {showDetails && prediction.top3.length > 1 && (
              <div className="bg-surface-container-lowest p-space-sm rounded-xl border-2 border-border-dark flex flex-col gap-1">
                <span className="font-label-xs text-label-xs uppercase font-bold text-on-surface-variant">Top Game Predictions:</span>
                <div className="flex flex-col gap-1">
                  {prediction.top3.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-label-sm font-bold">
                      <span className="text-on-surface">#{idx + 1} {item.label}</span>
                      <span className="text-primary">{item.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Hint Card */}
          <div className="bg-surface-container-low rounded-xl p-space-md border-2 border-border-dark flex gap-space-sm">
            <span className="material-symbols-outlined text-accent-blue text-[20px] shrink-0">tips_and_updates</span>
            <div className="text-on-surface-variant font-body-sm text-body-sm flex flex-col gap-1">
              <p className="font-bold text-on-surface">คำแนะนำการวาด:</p>
              <p>• ใช้แปรงเส้นบาง (ประมาณ 4–8px) จะทายแม่นยำกว่าแปรงหนา</p>
              <p>• วาดเส้นโครงร่างที่สื่อถึงวัตถุชัดเจน เช่น พระอาทิตย์มีแฉก, บ้านมีหลังคา</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
