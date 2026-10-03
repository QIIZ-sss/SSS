// A8/A9 Solo AI client: server word only, { targetWord, pixels } requests, stale results ignored, "Not sure yet…", no Skip.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import SoloAIGame from '../../client/src/gameModes/SoloAIGame.jsx';
import { SOLO_AI } from '../../shared/contract.js';
import { emitted, handlers } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const out = document.getElementById('out');
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = { code: '7', host: 'Solo', gameMode: 'SOLO_AI', status: 'PLAYING', currentRound: 2, totalRounds: 3, currentDrawer: 'Solo', currentWord: 'Clock',
  wordLength: 5, currentChallenge: 'NONE', teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Solo', score: 1000, team: 'Red' }] };
const host = document.getElementById('root'); host.style.width = '1100px';
const root = createRoot(host);
act(() => root.render(<SoloAIGame roomData={room} username="Solo" />));
const text = () => host.textContent;
const fire = (data) => act(() => (handlers.solo_ai_prediction_result || []).forEach((fn) => fn(data)));
const res = (o) => ({ targetWord: 'Clock', ready: true, guess: null, confidence: 0, isConfident: false, top3: [], modelSees: null, isCorrect: false, ...o });

check('target word is the server word (room_data.currentWord)', /Target: Clock/.test(text()));
check('round and score come from room_data', /2 \/ 3/.test(text()) && /1000/.test(text()));
check('no Skip Word button (client cannot pick a word)', !/Skip Word/i.test(text()));
// draw on the canvas, then wait for the prediction interval
const canvas = host.querySelectorAll('canvas')[0];
const ctx = canvas.getContext('2d'); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(320, 240, 100, 0, Math.PI * 2); ctx.stroke();
setTimeout(() => {
  const req = emitted.filter((e) => e.ev === 'solo_ai_predict').pop();
  check(`client sends { targetWord, pixels } every ${SOLO_AI.PREDICT_INTERVAL_MS} ms with the server word`,
    req && req.data.targetWord === 'Clock' && Array.isArray(req.data.pixels) && req.data.pixels.length === SOLO_AI.PIXEL_COUNT, req && `targetWord=${req.data.targetWord} pixels=${req.data.pixels.length}`);
  fire(res({ ready: false }));
  check('model not ready → "AI model is loading…"', /AI model is loading/.test(text()));
  fire(res({ guess: 'House', confidence: 92, isConfident: false, top3: [{ label: 'House', confidence: 92 }, { label: 'Clock', confidence: 5 }], modelSees: { label: 'lantern', confidence: 28 } }));
  check('A9 below the raw-probability threshold → "Not sure yet…" and no word names', /Not sure yet…/.test(text()) && !/House|lantern/.test(text()));
  fire(res({ targetWord: 'Sun', guess: 'Sun', confidence: 99, isConfident: true }));
  check('a result for another word (stale) is ignored', !/Current Guess\s*Sun/.test(text()) && /Not sure yet…/.test(text()));
  fire(res({ guess: 'Clock', confidence: 97, isConfident: true, top3: [{ label: 'Clock', confidence: 97 }, { label: 'Sun', confidence: 2 }], modelSees: { label: 'alarm clock', confidence: 30 }, isCorrect: true }));
  check('confident result shows the guess, top predictions and what the model sees', /Clock/.test(text()) && /alarm clock/.test(text()) && /#2 Sun/.test(text()));
  // T1-23: points now follow the FFA drawer / guesser rule (server), so the flash shows no fixed amount
  check('correct guess flash shows AI GUESSED CORRECTLY (no fixed point amount)', text().includes('AI GUESSED CORRECTLY') && !text().includes(`+${SOLO_AI.CORRECT_SCORE}`));
  act(() => root.render(<SoloAIGame roomData={{ ...room, currentRound: 3, currentWord: 'Sun' }} username="Solo" />));
  check('next server word resets the AI panel', /Target: Sun/.test(text()) && /Waiting for strokes/.test(text()));
  out.textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
}, SOLO_AI.PREDICT_INTERVAL_MS + 300);
