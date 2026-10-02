# ARCHITECTURE.md — JUST DRAW IT

This document has two strictly separated parts:

- **Part A — CURRENT ARCHITECTURE**: only what was verified by reading the repository at baseline commit `0d8fb96` (`chore: baseline snapshot`), updated by later tasks where marked (e.g. "Updated in P1.3"). Every CURRENT FACT cites the file that proves it. Line numbers refer to the baseline unless a section says otherwise.
- **Part B — TARGET ARCHITECTURE**: long-term direction. Nothing in Part B is implemented unless Part A says so.

Labels used:

- `CURRENT FACT` — verified from repository source/config.
- `DOCUMENTATION CLAIM` — stated by `HANDOFF.md`, `README*.md`, `qa/QA_REPORT.md`, or QA evidence; not independently proven.
- `UNCERTAIN` — not yet proven either way.
- `GAP` — known difference between current state and requirement/target.

---

# PART A — CURRENT ARCHITECTURE

## 1. Technology

- Server: Node.js, Express 4, Socket.io 4, `@tensorflow/tfjs` (`server/package.json`). CommonJS (`require`).
- Client: React 18, Vite 5, `socket.io-client`, Tailwind via CDN script (`client/package.json`, `client/index.html`).
- QA: Playwright + `socket.io-client` scripts (`qa/package.json`).
- Discovery environment: Node v24.18.0. No `node_modules` present in `server/`, `client/`, or `qa/` at baseline.

## 2. Live entry points and dead/legacy code

### 2.1 Live server path

`CURRENT FACT` — `server/package.json` `"main"`, `"start"`, `"dev"` all run `src/server.js`.

`server/src/server.js` requires (and only these are live):

| File | Role |
|---|---|
| `server/src/gameLogic/RoomManager.js` | Room registry singleton, room object shape, `sanitizeRoom()` |
| `server/src/gameLogic/RoundManager.js` | Turn/round state machine, scoring at round end, game over |
| `server/src/gameLogic/TimerManager.js` | Per-room `setInterval` countdown emitting `timer_tick` |
| `server/src/socket/gameHandler.js` | Room create/join/leave, ready, settings, start, select word, Solo AI predict, disconnect |
| `server/src/socket/drawHandler.js` | Drawing relay + `drawingHistory` |
| `server/src/socket/chatHandler.js` | Chat + guess checking + guesser scoring |
| `server/src/utils/aiPredictor.js` | DoodleNet loader/predictor (required by `gameHandler.js`) |
| `server/src/models/{Word,Score,User}.js` | Thin wrappers over in-memory store |
| `server/src/config/database.js` | In-memory store: users, scores, word bank |
| `server/src/controllers/{authController,leaderboardController}.js` | `POST /api/auth/login`, `GET /api/leaderboard` |
| `server/src/ai_model/*` | DoodleNet `model.json`, `group1-shard1of1.bin`, `class_names.txt` |

Shared files required by the live server: `shared/events.js`, `shared/gameConfig.js`, `shared/utils.js`, and (since P1.3) `shared/contract.js` from `server/src/gameLogic/RoundManager.js`.

### 2.2 Live client path

`CURRENT FACT` — `client/index.html` loads `/src/index.jsx` → `client/src/App.jsx`.

Live client files (reachable from `App.jsx`): `App.jsx`, `index.css`, `services/socket.js`, `gameModes/{MultiplayerGame,TeamGame,SoloAIGame}.jsx`, `components/{Canvas,ChatBox,ChallengeOverlay,RoomLobby,RoomList,Leaderboard,TimerBadge}.jsx`, `hooks/useGameTimer.js`, `utils/canvasToPixels.js`, `gameEngine/shapePreview.js`.

Shared files imported by the live client: `shared/events.js`, `shared/gameConfig.js`, and (since P1.2) `shared/contract.js`.

### 2.3 Dead / legacy code (NOT on the live path)

`CURRENT FACT` — none of the following is reachable from the live entry points. Do not edit or delete without explicit task authorization.

| Path | Evidence / note |
|---|---|
| `server/src/index.js`, `server/src/config.js` | ESM entry of an older "วาดต่อ" game; not referenced by `server/package.json` scripts |
| `server/src/net/`, `server/src/game/`, `server/src/http/`, `server/src/db/`, `server/src/auth/`, `server/src/util/`, `server/src/data/`, `server/src/scripts/` | Imported only by `server/src/index.js` chain; depend on `zod`, `jsonwebtoken`, `pg`, `helmet`, `dotenv`, etc., which are absent from `server/package.json` |
| `server/src/socket/roomHandler.js` | Not required by any file; imports `shared/constants.js` |
| `client/admin.html`, `client/src/admin/` | Admin UI for the legacy server (calls `/api/admin`, not served by `server.js`) |
| `client/src/main.jsx`, `client/src/styles.css`, `client/src/App.css` | `main.jsx` not loaded by `index.html`; `App.css` not imported anywhere |
| `client/src/screens/`, `client/src/components/{DrawCanvas,bits}.jsx`, `client/src/lib/`, `client/src/net/socket.js` | Only used by the legacy `screens/` chain |
| `shared/constants.js` | Only imported by dead `roomHandler.js` |
| ~~`shared/contract.js`~~ | No longer dead: required by the live server since P1.3 and imported by the client since P1.2 (see §4) |

`README.md` documents the legacy game and file layout, not the live one (`DOCUMENTATION CLAIM` vs `CURRENT FACT` conflict, see §17).

## 3. Server / client responsibilities (current)

### 3.1 Enforced on the server (CURRENT FACT)

- Host-only `start_game` and `update_room_settings` (by username) — `server/src/socket/gameHandler.js:89,118`.
- Settings only in `LOBBY`; numeric clamps (roundTime 15–180, totalRounds 1–10, maxPlayers 2–16) — `gameHandler.js:89-109`.
- Drawer-only and `PLAYING`-only drawing events — `server/src/socket/drawHandler.js` (each handler).
- Forced colour for `COLOUR_FIX` — `drawHandler.js:13-15,28-30,73-75`.
- Guess checking and all score computation — `server/src/socket/chatHandler.js:19-54`, `server/src/gameLogic/RoundManager.js:96-106`.
- Only the drawer may `select_word`, only in `WORD_SELECTION` — `gameHandler.js:130-137`.
- Room full check — `gameHandler.js:47-50`.

### 3.2 NOT enforced on the server (CURRENT FACT → GAP)

- **Updated in P2.1/P2.2:** `start_game` is validated by `getStartBlockReason()` in `gameHandler.js` — LOBBY only, all non-host ready, FFA ≥ `MIN_PLAYERS_FFA`, TEAM ≥ `MIN_PLAYERS_TEAM_TOTAL` with ≥ `MIN_PLAYERS_PER_TEAM` per team (Solo AI exempt). Switching a lobby to TEAM alternates players Red/Blue (no team-switch UI exists).
- ~~Drawer chat is broadcast to all — `chatHandler.js:70-74` (A6).~~ **Fixed in P3.2:** drawer messages are dropped during WORD_SELECTION/PLAYING (`GAME_RULES.DRAWER_CAN_CHAT`); `ChatBox.jsx` disables input.
- `select_word` does not validate `word` against `room.wordOptions` — `gameHandler.js:135`.
- `DONT_LIFT_PEN` and `GEOMETRIC_ONLY` enforced only in the client — `client/src/components/Canvas.jsx:157-165`.
- No payload validation or rate limiting in any live handler (`server/src/socket/*.js`).
- CORS `origin: '*'` — `server/src/server.js:21-26`.

### 3.3 Identity

`CURRENT FACT` — players and host are identified by `username`, not by a server-issued id. A new `join_room` with an existing username rebinds that player's `socketId` (`gameHandler.js:173-176`); host checks compare usernames (`gameHandler.js:89,118`). Risk: same-name join can take over a player/host slot.

## 4. Shared code and the `contract.js` gap

`CURRENT FACT`:

- `shared/events.js` — `SOCKET_EVENTS` (live).
- `shared/gameConfig.js` — `GAME_MODES`, `MINI_CHALLENGES`, `CHALLENGE_DETAILS`, `AVATARS`, `SCORING`, `DEFAULT_COLOR_PALETTE` (live).
- `shared/utils.js` — `calculateGuesserScore`, `calculateDrawerScore`, `normalizeGuess`; re-declares its own `SCORING` (live).
- `shared/constants.js` — duplicates `GAME_MODES`, `MINI_CHALLENGES`, `CHALLENGE_DETAILS`, `SCORING`, palette and an older `SOCKET_EVENTS` without `ROUND_CHANGE`/`SHAPE_PREVIEW` (dead).
- `shared/events.js`, `gameConfig.js`, `utils.js`, `constants.js` mix `export const` with a guarded `module.exports`. The CommonJS server loads them via Node's require(esm) support (works on Node v24; `UNCERTAIN` on older Node).
- `shared/contract.js` — `GAME_STATUS`, `GAME_RULES` (`MIN_PLAYERS_FFA`, `MIN_PLAYERS_PER_TEAM`, `MIN_PLAYERS_TEAM_TOTAL`, `REQUIRE_ALL_READY`, `DRAWER_CAN_CHAT`, `REVEAL_WORD_STATUSES`, `ROOM_PIN_LENGTH`, `RECONNECT_GRACE_MS`), `WORD_DIFFICULTY`, `SOLO_AI`, `isValidPredictRequest()`. At baseline it was CommonJS-only and imported by nothing. **Updated in P1.3:** `server/src/gameLogic/RoundManager.js` requires it (`GAME_RULES.GAME_OVER_DELAY_MS` = 10000). **Updated in P1.2:** same dual ESM/CJS pattern as `events.js` (`export` + guarded `module.exports`); the client imports it (`client/src/App.jsx`: `GAME_STATUS`).

`DOCUMENTATION CLAIM` — `HANDOFF.md` §1: "all constants live in `shared/contract.js` in one place".

`GAP (architectural)` — `shared/contract.js` is loadable by both runtimes (P1.2) but is **not yet** the full runtime source of truth: values are adopted task by task. Values it defines are hardcoded elsewhere, e.g.:

| Concept | Hardcoded at |
|---|---|
| Status strings | `RoomManager.js:43`, `RoundManager.js:17,47,64,73,94,137`, `gameHandler.js:89,132`, `chatHandler.js:17`, client `gameModes/*.jsx` |
| AI thresholds 0.5 / 0.1 | ~~`aiPredictor.js:10,13`~~ — from `SOLO_AI` since A8 |
| 19 AI words | ~~`aiPredictor.js`, `SoloAIGame.jsx`~~ — `SOLO_AI.GAME_WORDS` since A8 |
| AI correct score 500 | ~~`gameHandler.js`, `SoloAIGame.jsx`~~ — `SOLO_AI.CORRECT_SCORE` since A8 |
| PIN length 5 | `RoomManager.js:14` (room code generator); client uses `ROOM_PIN_LENGTH` since B3 |

Resolution: **P1.2** (done) made `contract.js` loadable by both runtimes; later tasks switch the values they touch to the contract.

## 5. Room management

`CURRENT FACT` — `server/src/gameLogic/RoomManager.js`:

- In-memory `Map` of rooms keyed by 5-digit code from `Math.random` (`:11-17`).
- Seeded permanent public room `'83921'` (`:19-23`); never removed (`:63-67`, `gameHandler.js:210`).
- Room object fields: `players[{socketId, username, avatar, score, isReady, team}]`, `teams.{Red,Blue}.score`, `status`, `currentRound`, `drawerIndex`, `currentDrawer`, `currentWord`, `wordOptions`, `correctGuessers`, `currentChallenge`, `forcedColor`, `drawingHistory` (`:27-53`).
- `sanitizeRoom()` builds one payload for **every** client including `currentWord` and `wordLength` (`:86-116`).
- Leave/disconnect: player removed immediately; empty non-seed room deleted; host passes to `players[0]` (`gameHandler.js:196-229`). **Updated in P2.3:** turn order is adjusted via `RoundManager.handlePlayerRemoved()`; an emptied seed room is reset with `returnToLobby()`.
- Team assignment balances Red/Blue at join (`gameHandler.js:166-171`).

## 6. Game state handling (current state machine)

`CURRENT FACT` — status is a plain string on the room, set in `server/src/gameLogic/RoundManager.js`; the constant `GAME_STATUS` is not used. **Updated in P1.3.**

```text
LOBBY
  │ start_game (host; LOBBY; all non-host ready; min players — P2.1/P2.2)
  ▼
WORD_SELECTION  (10 s timer; auto-pick wordChoices[0])            RoundManager.startTurnSelection
  │ select_word (drawer) or timeout
  ▼
PLAYING         (roundTime timer)                                  RoundManager.startRoundDrawing
  │ timeout | all guessers correct | Solo AI correct
  ▼
ROUND_OVER                                                         RoundManager.endRound
  │ 4 s via TimerManager.scheduleTransition (cancellable; cleared by stopTimer)
  ├─ not final turn  → WORD_SELECTION
  └─ final turn or room empty → GAME_OVER                          RoundManager.endGameMatch
GAME_OVER       (final scores kept; no timer_tick)
  │ GAME_RULES.GAME_OVER_DELAY_MS (10 s) via scheduleTransition
  ▼
LOBBY           (round/score/ready state reset)                    RoundManager.returnToLobby
```

Pending transitions are stored per room in `TimerManager.roomTransitions`; `TimerManager.stopTimer()` clears them, so the empty-room path (`gameHandler.js` `handlePlayerLeave` → `stopTimer`) and every new transition cancel any stale timeout.

### 6.1 Round counter (root of "Round 4/3") — fixed in P1.3

Baseline (`0d8fb96`) behaviour, kept for history:

- `currentRound++` happened in `endRound` **before** the `totalRounds` check, so `endGameMatch` broadcast `currentRound = totalRounds + 1`.
- Clients render `ROUND {currentRound} / {totalRounds}` (`client/src/gameModes/MultiplayerGame.jsx:74`, `TeamGame.jsx:71`) and only special-case `status === 'LOBBY'`, so the arena kept showing "ROUND 4 / 3".
- "BACK TO LOBBY" only closed the modal client-side; no server path left `GAME_OVER`.

Current (`CURRENT FACT`, after P1.3):

- `endRound` increments `currentRound` only if `currentRound < totalRounds`; otherwise it marks the final turn — `server/src/gameLogic/RoundManager.js` `endRound`.
- `endGameMatch` keeps scores and schedules `returnToLobby()` after `GAME_RULES.GAME_OVER_DELAY_MS` — `RoundManager.js`, `shared/contract.js`.
- `returnToLobby()` resets `currentRound`, `drawerIndex`, drawer, word, word options, correct guessers, challenge, forced colour, drawing history, player scores, `isReady`, team scores; emits `room_data` and `room_list_updated`.
- Result modal: button `LEAVE ROOM` calls the existing `handleLeaveRoom` (`leave_room` → Home); the modal closes automatically when `room_data.status === 'LOBBY'` — `client/src/App.jsx`.
- `start_game` is accepted only from `LOBBY` with all non-host players ready (P2.1).
- **P2.3:** leaves adjust `drawerIndex`; drawer leaving ends the turn; a round whose remaining drawers left is closed in `startTurnSelection()`; `currentWord` is cleared at WORD_SELECTION.

### 6.2 Timer

`CURRENT FACT` — `server/src/gameLogic/TimerManager.js` keeps one `setInterval` per room, emits `timer_tick {timeRemaining}` every second to the room, stops at 0 and calls the expire callback. `startTimer` stops any previous timer first (`:16-17`). Client mirrors it via `client/src/hooks/useGameTimer.js` (sets 0 on `round_change`).

`DOCUMENTATION CLAIM` — QA T-01/T-02/T-03 PASS. T-02 evidence shows identical `00:42` in every round, which does not prove countdown.

**Updated in P2.5 (runtime evidence):** over 3 rounds × 2 players without refresh, every PLAYING turn ticked `roundTime..0` at 1000–1004 ms spacing, reached 0 on timeout, and two clients differed by ≤ 1 ms. Server timer: verified. On-screen display: MANUAL.

## 7. Socket events (current contract)

Event names from `shared/events.js`. Payloads as observed in live code.

| Direction | Event | Payload (current) | Source |
|---|---|---|---|
| C→S | `get_rooms` | — | `gameHandler.js:9` |
| C→S | `create_room` | `{name, username, avatar, gameMode, maxPlayers, roundTime, miniChallengeEnabled}` + ack `{success, roomId, code}` | `App.jsx:96-110`, `gameHandler.js:14-32` |
| C→S | `join_room` | `{code \| roomId, username, avatar}` + ack | `App.jsx:85`, `RoomList.jsx:25`, `gameHandler.js:35-55` |
| C→S | `rejoin_room` (**new in P4.1**) | `{code, sessionId}` + ack `{success, roomId, code, username, avatar}` | `App.jsx`, `gameHandler.js` |
| C→S | `leave_room` | — | `App.jsx:114` |
| C→S | `switch_team` | `{team}` | `gameHandler.js:63` |
| C→S | `toggle_ready` | — | `RoomLobby.jsx:21` |
| C→S | `update_room_settings` | partial settings object; **+ `wordDifficulty` since D1** | `RoomLobby.jsx` |
| C→S | `start_game` | — | `RoomLobby.jsx:25` |
| C→S | `select_word` | `{word}` | `MultiplayerGame.jsx:18` |
| C→S | `draw_begin` / `draw_path` / `draw_end` / `draw_fill` / `shape_preview` | stroke data objects | `Canvas.jsx` |
| C→S | `draw_clear`, `draw_sync` | — | `Canvas.jsx`, `SoloAIGame.jsx:43` |
| C→S | `send_chat` | `{text}` | `ChatBox.jsx:30` |
| C→S | `solo_ai_predict` | **since A8:** `{targetWord, pixels}` (baseline `{pixels}`) | `SoloAIGame.jsx` |
| S→C | `room_data` | `sanitizeRoom()` output — **per player since P3.1** (`currentWord` only for drawer / reveal states) | `RoomManager.js` `sanitizeRoom`, `emitRoomData` |
| S→C | `room_list_updated` | room summaries | `RoomManager.js:69-84` |
| S→C | `round_change` | `{currentDrawer, currentRound, totalRounds, status}` | `RoundManager.js:43-48` |
| S→C | `word_selection` | `{words}` — drawer socket only | `RoundManager.js:54-60` |
| S→C | `round_start` | `{drawer, round, totalRounds, challenge, forcedColor, roundTime}` | `RoundManager.js:75-82` |
| S→C | `timer_tick` | `{timeRemaining}` | `TimerManager.js:20,24` |
| S→C | `round_end` | `{word, reason, drawerPoints, correctGuessers}` — **no client listener** | `RoundManager.js:108-113` |
| S→C | `game_over` | `{winnerText, finalScores, teamScores}` | `RoundManager.js:155-159` |
| S→C | `chat_message` | `{sender, text, isSystem?, isCorrectNotice?, guesser?, isConcealedChat?}` | `chatHandler.js`, `gameHandler.js` |
| S→C | `correct_guess` | `{points}` — guesser only | `chatHandler.js:47` |
| S→C | `solo_ai_prediction_result` | **since A8:** `{targetWord, ready, guess, confidence, isConfident, top3, modelSees, isCorrect}` | `aiPredictor.js` |

`GAP` — `shared/contract.js` documents a different Solo AI payload (`{targetWord, pixels}` → `{targetWord, guess, confidence, top3, modelSees, isCorrect}`). The live code does not follow it.

## 8. Player data visibility (current)

**Updated in P3.1 (pre-approved contract change):** `room_data` is sent per player by `RoomManager.emitRoomData()`; `sanitizeRoom(room, t, viewer)` sets `currentWord` to `''` unless the viewer is the current drawer or `status` is in `GAME_RULES.REVEAL_WORD_STATUSES`. The table below is the **baseline** (`0d8fb96`) behaviour, kept for history; after P3.1 every "LEAK" cell is closed (verified by a leak-scan e2e).

Baseline `CURRENT FACT` — one `room_data` payload was broadcast to the whole room (`io.to(room.id)`) and always contained `currentWord` (`RoomManager.js:109`).

| State | Drawer receives | Guesser receives | Evidence |
|---|---|---|---|
| LOBBY | `currentWord` ('' or stale) | same | `RoomManager.js:47,109` |
| WORD_SELECTION | candidate list via `word_selection`; `room_data.currentWord` = previous round's (already revealed) word | `room_data.currentWord` = previous word; **no** candidate list | `RoundManager.js:50,54-60`; `currentWord` not cleared in `startTurnSelection` |
| PLAYING | `currentWord` | **`currentWord` — LEAK** (every `room_data`: round start, correct guess, join, leave, ready, team switch) | `RoundManager.js:84`, `chatHandler.js:48`, `gameHandler.js:70,82,188,220` |
| ROUND_OVER | `currentWord`, `round_end.word` | same (allowed) | `RoundManager.js:108-115` |
| GAME_OVER | last word | same | `RoundManager.js:161` |
| Mid-game join | full `room_data` incl. `currentWord`; full `drawingHistory` via `draw_sync` | same → leak | `gameHandler.js:188`, `drawHandler.js:83-88` |

Client UI hides the word from guessers (`'_ '.repeat(wordLength)` — `MultiplayerGame.jsx:25-27`), but this is UI-only. **Updated in P2.4:** `MultiplayerGame.jsx`/`TeamGame.jsx` show the answer to everyone when `status` is in `GAME_RULES.REVEAL_WORD_STATUSES` (from `room_data.currentWord`; still no `round_end` listener).

### 8.1 Correct-guess chat (current)

`CURRENT FACT` — `chatHandler.js:19-54`: a correct guess is **not** echoed; the room gets a neutral system message `🎉 คุณ X ทายถูกแล้ว! (+N คะแนน)` with `isCorrectNotice`, the guesser gets `correct_guess {points}`. Later messages from correct guessers go only to the drawer and other correct guessers (`isConcealedChat`, `:57-69`); the client masks them (`ChatBox.jsx:63-70`). Non-PLAYING messages are broadcast to everyone (`:70-74`). Drawer messages during WORD_SELECTION/PLAYING are rejected since P3.2.

## 9. Word management

**Updated in D1 (approved contract change):** the bank uses `WORD_DIFFICULTY` values; the host picks `wordDifficulty` (EASY / MEDIUM / HARD / null = Mixed) via `update_room_settings`, `room_data` carries it, and `RoundManager.startTurnSelection` draws word choices only from that difficulty. Baseline below.

Baseline `CURRENT FACT` — `server/src/config/database.js:7-28`: 20 in-memory words with `category` and lowercase `difficulty` (`'easy'|'medium'|'hard'`). `Word.getRandomWords(3)` (`server/src/models/Word.js`, `database.js:113-116`) shuffles all words regardless of mode or difficulty. `difficulty` is never read. The bank includes `Astronaut`, which is not one of the DoodleNet game classes (`aiPredictor.js:16-36`). `WORD_DIFFICULTY` in `contract.js` uses uppercase values and is unused.

## 10. Challenges

`CURRENT FACT`:

- Challenge chosen at random per turn from `room.enabledChallenges` — `RoundManager.js:27-37`. `COLOUR_FIX` picks `forcedColor` from `DEFAULT_COLOR_PALETTE`.
- Shown as an inline banner (`ChallengeOverlay.jsx`) and, **since D3**, as a popup at the start of each turn (`ChallengeTurnPopup`, closed by GOT IT or after `UI.CHALLENGE_POPUP_MS`; for the drawer also when PLAYING starts) in Multiplayer / Team / Solo.
- `DONT_LIFT_PEN`: client-side lock; **since D3** the violation is shown with `ChallengeModal` (baseline used `alert()`).
- `GEOMETRIC_ONLY`: client forces shape tools — `Canvas.jsx:163-165`; ghost preview relayed via `shape_preview` (`drawHandler.js:38-44`).

## 11. Scoring

`CURRENT FACT` — guesser: `calculateGuesserScore` (`shared/utils.js:8-15`) in `chatHandler.js:28`; drawer: `calculateDrawerScore` in `RoundManager.js:96-98`; team score accumulates per team (`chatHandler.js:33-35`, `RoundManager.js:103-105`). Scores reset on `start_game` (`gameHandler.js:122-124`). End-of-game records saved to in-memory store except Solo AI (`RoundManager.js:139-143`, `database.js:69-71`).

## 12. Drawing / canvas

`CURRENT FACT` — `client/src/components/Canvas.jsx`:

- Two stacked canvases (main + ghost), fixed 640×480 — `:281-299`.
- **Updated in P5.1:** input uses Pointer Events (primary pointer, `preventDefault` on down) with `touch-action: none` on the canvas container and drawing canvas; `getCanvasCoords` scales to the 640×480 canvas space. (Baseline: `onMouse*`/`onTouch*`, no `touch-action` on the live path, unscaled CSS-pixel coordinates.)
- **Updated in P7.3 (D2):** three layers — stroke canvas (transparent, first in DOM, read by Solo AI), background canvas (bucket fill, `-z-10`), ghost canvas. The eraser uses `destination-out` on the stroke layer only (local, remote and `draw_sync` replay). (Baseline: eraser painted `#ffffff`; bucket filled the whole single canvas.)
- Server keeps `drawingHistory` and replays it on `draw_sync` — `drawHandler.js:83-88`.

## 13. Solo AI

**Updated in A8/A9 (pre-approved Solo AI payload change):** `heuristicFallback()`/`Math.random` removed (not ready → `ready:false`, never correct); server owns the target word (Solo turns start PLAYING immediately with an AI-supported word); request `{ targetWord, pixels }` validated, stale targets ignored, rate-limited; result `{ targetWord, ready, guess, confidence, isConfident, top3, modelSees, isCorrect }`; client shows "Not sure yet…" when not confident; client Skip button removed. The list below is the **baseline** description.

Baseline `CURRENT FACT`:

- Real DoodleNet (345 classes) is loaded from `server/src/ai_model/` via `tf.loadLayersModel(tf.io.fromMemory(...))` — `server/src/utils/aiPredictor.js:75-126`.
- Decision: target must be top-1 among game words, game share ≥ 0.5, raw prob ≥ 0.1 — `aiPredictor.js:214-222` (thresholds hardcoded at `:10,13`).
- **Defect:** `heuristicFallback()` returns `Math.random`-based guesses/correctness when the model is not loaded or prediction throws — `aiPredictor.js:160-162,237-240,246-261`. This must be removed/replaced by A8/A9 (not protected code).
- Unused `presetDrawings` / `getAIDrawingStrokes` — `aiPredictor.js:49-67,263-268`.
- Client sends `{pixels}` every 1 s from the first `<canvas>` in the DOM — `SoloAIGame.jsx:87-103`.
- Server ignores any client target and compares against `room.currentWord` — `gameHandler.js:140-152`.
- **Target mismatch:** the client chooses its own random `targetWord` from a hardcoded list and advances it locally (`SoloAIGame.jsx:9-13,22-44`), while the server's `room.currentWord` comes from the general word bank (may be `Astronaut`) and advances via the normal round loop. Client also adds +500 locally (`:72`).
- No "Not sure yet…" display for low confidence (A9). `isValidPredictRequest()` and `SOLO_AI.SERVER_MIN_INTERVAL_MS` are not used.

`DOCUMENTATION CLAIM` — `HANDOFF.md` A8 / `README_AI.md`: client sends `{targetWord, pixels}` and server uses `aiPredictor.predict()`. No `predict()` method exists on `AIPredictor`.

## 14. Session / reconnect

**Updated in P4.1 (pre-approved contract change):** reconnect exists. `create_room`/`join_room` acks return a random `sessionId`; `disconnect` keeps the player slot for `GAME_RULES.RECONNECT_GRACE_MS` (30 s); new event `rejoin_room` `{ code, sessionId }` rebinds the socket and re-sends role-based `room_data` (and `word_selection` to the drawer only). Client keeps `{ code, sessionId }` in `sessionStorage` and rejoins on every socket `connect` (`client/src/App.jsx`). Baseline description below kept for history.

Baseline `CURRENT FACT` — **no reconnect/session implementation existed.**

- `disconnect` → `handlePlayerLeave` removes the player immediately (`gameHandler.js:155-157,196-229`). `RECONNECT_GRACE_MS` is not used.
- Client keeps the room only in React state `currentRoomId` (`App.jsx:24`); only `game_username`/`game_avatar` are persisted in `localStorage` (`App.jsx:13-15,66-67`). A refresh returns to Home.
- `socket.io-client` auto-reconnect is on (`client/src/services/socket.js:7-10`), but nothing rejoins the room.

`DOCUMENTATION CLAIM` — QA NW-07 PASS ("rebinds socketId, restoring score"). The result is hardcoded in `qa/test_nw_cases.js:145-149`; contradicted by the code above.

## 15. Network / client connection

`CURRENT FACT` — `client/src/services/socket.js:3-5` uses `http://localhost:4000` only when `hostname === 'localhost'`, otherwise `window.location.origin`. Vite proxies `/socket.io` and `/api` to `http://127.0.0.1:4000` and binds `127.0.0.1:5173` by default (`client/vite.config.js`). **Verified in P5.4:** the default dev server is not reachable from another address; with `--host`, a socket client on a non-loopback address connects through the Vite proxy and can create a room. Real-device LAN play: MANUAL.

## 16. Tests / QA

`CURRENT FACT`:

- No unit tests. QA scripts `qa/test_*.js`, `qa/retest_targeted_cases.js` require a running server (:4000) and client (:5173).
- `qa/package.json` `"test"` runs `test_runner.js`, which does not exist.
- Many results are assigned a literal `status: 'PASS'` without assertions, e.g. `qa/test_nw_cases.js:145-170` (NW-07…NW-10), `qa/test_drawing_eraser.js:199-252` (D-07, D-02, C-01…C-08), `qa/test_modes_and_ui.js:208-245` (UI-01…UI-03, R-04), `qa/test_sec_cases.js:109,125` (SEC-04, SEC-05).
- `QA_AGENT_TASK.md` referenced by `HANDOFF.md` does not exist.

`DOCUMENTATION CLAIM` — `qa/QA_REPORT.md`: 90 cases, PASS 76 / FAIL 7 / MANUAL 1 / N/A 6. All of these are treated as claims until re-verified with new runtime evidence.

## 17. Documentation vs implementation conflicts

| # | Documentation claim | Current fact |
|---|---|---|
| 1 | `contract.js` is the single source of truth (`HANDOFF.md` §1) | Loadable by both runtimes since P1.2; values adopted task by task (§4) |
| 2 | `HANDOFF.md` C2/C3/C4 cite "BUG-05/06/07" | Those numbers are `QA_REPORT.md` numbering and collide with the team's 14-bug list |
| 3 | `README.md` describes the "วาดต่อ" game and file map | Live code is `server.js` + `gameLogic/` + `socket/` (§2). Run section corrected in C2; other sections still legacy (README warns) |
| 4 | QA NW-07 PASS (reconnect keeps score) | Was false at baseline; reconnect implemented in P4.1 (§14) |
| 5 | QA T-04 PASS (timeout reveals answer) | Payload contained the word but the UI did not show it; fixed in P2.4 (§8) |
| 6 | QA T-02 PASS (timer) | Evidence shows identical values, not a countdown (§6.2) |
| 7 | `HANDOFF.md`: eraser does not exist | Baseline had a white-paint "eraser"; real partial eraser added in D2 (§12) |
| 8 | A8/README_AI: `{targetWord, pixels}`, `predict()` | Baseline `{pixels}` + `Math.random` fallback; since A8 `{targetWord, pixels}`, no fallback; method is still `predictUserDrawing()` (§13) |
| 9 | QA D-07 script note: touch handlers use `preventDefault` | False at baseline; Pointer Events + `touch-action: none` added in P5.1 (§12) |
| 10 | QA H-04 PASS (rapid START starts once) | No status guard on `start_game` (§3.2) |

## 18. Architecture risks

- `room_data` is per player since P3.1; any new secret field must go through `sanitizeRoom(room, t, viewer)`.
- Username-based identity → slot/host takeover by name collision.
- Overlapping round loops: mitigated — `start_game` is LOBBY-only since P2.1 and the 4 s transition is cancellable since P1.3.
- Mid-game joins still extend the current round (new player is appended to the rotation).
- Duplicate constants across `shared/` files and hardcoded values in live code.
- Large dead/legacy tree → agents may edit the wrong file.

---

# PART B — TARGET ARCHITECTURE (direction only, not implemented)

Migration is gradual and requirement-driven. **Do not move files to match this tree.**

```text
JUST DRAW IT

shared/
├── events
├── states
├── types
├── modes
└── constants

server/
├── session
├── room
├── player
├── game
├── words
├── challenge
├── score
├── ai
├── validation
└── socket

client/
├── pages
├── canvas
├── components
└── styles

tests/
├── functional
├── security
├── mobile
└── network
```

## B1. Intended responsibilities

| Area | Responsibility |
|---|---|
| `shared` | Contracts and values used by both client and server (events, states, rules, modes) |
| `server/game` | State machine, rounds, turns, transitions |
| `server/validation` | Whether an action is legal (role, state, readiness, player counts) |
| `server/room` | Room lifecycle, join/leave, PIN |
| `server/session` | Reconnect and player identity persistence |
| `server/words` | Word bank and difficulty (with AI support flag) |
| `server/challenge` | Mini-challenge selection and enforcement |
| `server/score` | Score calculation |
| `server/ai` | Model/predictor integration only — must not own the game loop |
| `server/socket` | Thin transport handlers delegating to game/room/validation |
| `client/pages` | Screens and user flow |
| `client/canvas` | Pointer/touch/drawing behaviour |
| `client/components` | Reusable UI components |

Server is authoritative for gameplay and security; the client renders state and provides UX restrictions only.

## B2. Target game state model (TARGET — not current)

```text
LOBBY → WORD_SELECTION → PLAYING → ROUND_OVER → WORD_SELECTION → PLAYING → … → GAME_OVER → LOBBY
```

Two transitions must remain separate:

```text
End of game:     ROUND_OVER → GAME_OVER → LOBBY
Between rounds:  ROUND_OVER → WORD_SELECTION → PLAYING
```

- `GAME_OVER` must prevent another round from being created after the final round; the displayed round never exceeds `totalRounds`.
- Scores remain available during `GAME_OVER`; they are cleared only when returning to `LOBBY` / initializing a new game.
- Returning to `LOBBY` resets round state and ready state; a new game starts at Round 1 and requires Ready again.

## B3. Target player data visibility (TARGET — network/security requirement)

```text
Drawer:
- may receive currentWord
- receives WORD_SELECTION candidate words (only the drawer)

Guesser / non-drawer:
- must NOT receive currentWord during WORD_SELECTION
- must NOT receive currentWord during PLAYING
- must NOT receive candidate words
- may receive wordLength
- may receive currentWord during ROUND_OVER
- GAME_OVER: reveal according to the Result UI
```

- Visibility is enforced by what the server sends, not by UI hiding.
- Correct guesses are announced neutrally ("X guessed correctly"); the guessed text is never broadcast.
- Reconnect/snapshot/join payloads use the same per-role visibility rules as normal broadcasts.

## B4. AI boundary (TARGET)

DoodleNet remains the model. `server/ai` exposes prediction only; game flow (target word, round end, scoring) stays in game/score code. No random/heuristic fallback may claim a correct answer. Solo AI target words come from words the model supports.
