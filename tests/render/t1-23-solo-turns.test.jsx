// T1-23: the Solo game screen on both turn types — banner, word visibility, canvas role, guess chat, scores, timer.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SoloAIGame from '../../client/src/gameModes/SoloAIGame.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const room = (extra) => ({ code: '1', name: 'S', host: 'Ann', gameMode: 'SOLO_AI', status: 'PLAYING', currentRound: 1, totalRounds: 3, roundTime: 60, timeRemaining: 42,
  currentChallenge: 'NONE', forcedColor: null, teams: { Red: { score: 0 }, Blue: { score: 0 } }, players: [{ username: 'Ann', avatar: '🐶', score: 460, isReady: false, team: 'Red' }],
  aiScore: 300, ...extra });
const human = renderToStaticMarkup(<SoloAIGame roomData={room({ soloTurn: 'HUMAN', currentDrawer: 'Ann', currentWord: 'Clock', wordLength: 5 })} username="Ann" />);
const ai = renderToStaticMarkup(<SoloAIGame roomData={room({ soloTurn: 'AI', currentDrawer: null, currentWord: '', wordLength: 5 })} username="Ann" />);
const over = renderToStaticMarkup(<SoloAIGame roomData={room({ soloTurn: 'AI', currentDrawer: null, currentWord: 'Apple', wordLength: 5, status: 'ROUND_OVER' })} username="Ann" />);
check('HUMAN turn: banner "Your turn to draw"', /id="soloTurnBanner"[^>]*>✏️ Your turn to draw/.test(human) && !/AI is drawing/.test(human));
check('HUMAN turn: the human sees the target word', /id="soloWord">Clock</.test(human));
check('HUMAN turn: drawing tools shown, AI Guesser panel, no guess chat', /aria-label="Pen"/.test(human) && /AI Guesser/.test(human) && !/GUESS FEED/.test(human));
check('AI turn: banner "AI is drawing"', /id="soloTurnBanner"[^>]*>🤖 AI is drawing/.test(ai) && !/Your turn to draw/.test(ai));
check('AI turn: word hidden — blanks only (wordLength 5)', /id="soloWord">_ _ _ _ _</.test(ai) && !/Clock|Apple/.test(ai));
check('AI turn (currentDrawer null) is still a live turn: no drawing tools, guess chat enabled', !/aria-label="Pen"/.test(ai) && /GUESS FEED/.test(ai)
  && /TYPE YOUR GUESS HERE/.test(ai) && !/You are drawing/.test(ai));
const timer = (h) => /id="round-timer-box"[\s\S]*?00:42/.test(h);
check('both turns: timer box shown while PLAYING (00:42)', timer(human) && timer(ai));
check('both turns: "You · AI" scores from room_data (460 · 300)', /id="soloScores">460 · 300</.test(human) && /id="soloScores">460 · 300</.test(ai));
check('after the AI turn (ROUND_OVER) the word is shown', /id="soloWord">Apple</.test(over));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
