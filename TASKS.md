# TASKS.md — JUST DRAW IT

Task plan derived from `HANDOFF.md` §3 (requirements A1–A9, B1–B5, C1–C4, D1–D3), the team's original 14-bug report, and the read-only discovery recorded in `ARCHITECTURE.md`.

Rules for every task: follow `AGENTS.md`. Facts about current behaviour are in `ARCHITECTURE.md` (cited by section, e.g. `ARCH §6.1`).

**Files allowed** — task sections still show the original `TBD after read-only discovery` / candidate lists; the files actually changed are listed in each task's **Status** entry. For new work, list the verified files after discovery and get approval if `AGENTS.md` §2 is triggered.

**QA evidence** — all existing `qa/QA_REPORT.md` results are DOCUMENTATION CLAIMS (many hardcoded `PASS`). A task is verified only by new runtime evidence produced for that task.

---

## 0. Status overview

| Task | Req | Phase | Status |
|---|---|---|---|
| DOC-0 | — | 0 | Done — commit `853c0be` |
| P1.1 | A2 (discovery) | 1 | Done — findings below |
| P1.2 | contract gap (supports A1–A6, B3, B4, D1, A8/A9) | 1 | Done |
| P1.3 | A2 | 1 | Done (automated); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported |
| P1.4 | A2 regression | 1 | Done (automated, incl. "new game requires Ready" after P2.1); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported |
| P2.1 | A4 | 2 | Done (automated); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported |
| P2.2 | A5 | 2 | Done (automated); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported |
| P2.3 | between-round transition | 2 | Done (automated); MANUAL pending |
| P2.4 | A3 | 2 | Done (automated); MANUAL pending |
| P2.5 | A7 | 2 | Done — server timer verified (no code change); client display MANUAL pending |
| P3.1 | A1 | 3 | Done (automated); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported (DevTools check) |
| P3.2 | A6 | 3 | Done (automated); MANUAL pending |
| P4.1 | B4 | 4 | Done (server e2e + client DOM test); MANUAL (Chrome desktop, 2 tabs) performed by human — no failures reported (real refresh) |
| P5.1 | B1 | 5 | Implemented; real-device test MANUAL pending |
| P5.2 | B2 | 5 | Done (headless Chrome 375 / 820 px, 9 screens); real devices MANUAL pending |
| P5.3 | B3 | 5 | Done (logic + headless Chrome DOM test); mobile keypad MANUAL pending |
| P5.4 | B5 | 5 | Verified on a non-localhost host (no code change); real devices MANUAL pending |
| P6.1 | C1 | 6 | Done |
| P6.2 | C2 | 6 | Done — run section fixed, then README rewritten for the live game (human request) |
| P6.3 | C3 | 6 | Done |
| P6.4 | C4 | 6 | Done; 375 px visual check MANUAL pending |
| P6.5 | D1 | 6 | Done (automated); MANUAL NOT TESTED |
| P7.1 | A8 | 7 | Done (automated, real model); MANUAL drawing test NOT TESTED |
| P7.2 | A9 | 7 | Done (automated); MANUAL NOT TESTED |
| P7.3 | D2 | 7 | Done (headless Chrome test); real-device MANUAL pending |
| P7.4 | D3 | 7 | Done incl. auto-close follow-up (headless Chrome test); MANUAL NOT TESTED |

### Regression suite (`tests/`)

- Status: **in repo**, run with `tests/check_all.sh` (see `tests/README.md`). Last run on branch `dev` (with D1, D3, A8/A9): **32 passed, 0 failed, 0 skipped** (~12.5 min): syntax, contract, state-machine harness 20/20, client build, 7 render tests, 8 headless-Chrome runs (A8/A9 client 10/10, B3 9/9, B4 client 6/6, D1 setting 6/6, D2+B1 16/16, D3 popup 13/13, layout 375 px 9/9, 820 px 9/9), server on port 4100 + 11 e2e files (A2 14, A8/A9 20, B4 20, D1 13, P2.1 8, P2.2 9, P2.3 11, P2.4 4, P2.5 5, P3.1 7, P3.2 5), server log clean.
- Without Chrome (`CHROME_PATH` not found) browser tests are SKIP, not FAIL (verified: 14 passed, 5 skipped). The layout test also needs network access to the Tailwind CDN.
- Negative controls (`node tests/negative-control/run.js`, not in `check_all.sh`): EXPECTED FAIL on old commits — harness @ `853c0be` 11/20, D2 @ `36c2e47` 9/16, B2 @ `32d371d` 8/9.
- Machine-specific paths: `qa/QA_REPORT.md` contained 19 links to an absolute Windows path on the machine that wrote the report; replaced with repository-relative links (`../…`) — link text and every QA result unchanged. No other `file:///`, `D:/`, `C:\\` or `/Users/` paths remain outside `node_modules`.
- Not automated: B5 LAN check (needs `vite --host` + a non-loopback address; recorded in P5.4) and every MANUAL item below.
- Every task that changes behaviour should add or update a test here and keep `tests/check_all.sh` green.

### Manual test log (human tester)

Only what the human reported is recorded here. Automated results are **not** manual evidence.

| # | Manual check | Covers | Status |
|---|---|---|---|
| 1 | Phase 1 two-tab flow: game ends → LOBBY after 10 s → Ready again → new game at Round 1 | A2 (P1.3/P1.4), P2.1 | Performed 2026-10-02, Chrome desktop, 2 tabs — reported done, no failures reported |
| 2 | START disabled + "Waiting for…" hint in lobby (FFA and Team) | P2.1, P2.2 | Performed 2026-10-02, Chrome desktop, 2 tabs — reported done, no failures reported |
| 3 | DevTools on the guesser: `currentWord` empty in PLAYING, present in ROUND_OVER | P3.1 (A1) | Performed 2026-10-02, Chrome desktop, 2 tabs — reported done, no failures reported |
| 4 | Real browser refresh mid-game (drawer and guesser) returns to the same room | P4.1 (B4) | Performed 2026-10-02, Chrome desktop, 2 tabs — reported done, no failures reported |
| 5 | Finger / stylus drawing on a real phone and iPad (no scroll/zoom), eraser | B1, D2 | **NOT TESTED** |
| 6 | PIN boxes on a real phone (numeric keypad, auto-advance, paste) | B3 | **NOT TESTED** |
| 7 | LAN play with more than 3 devices (`npm run dev -- --host`) | B5 | **NOT TESTED** |
| 8 | Result modal and screens on Safari / iPad | B2 and UI | **NOT TESTED** |

---

## 1. Requirement coverage

| Req | Short description (`HANDOFF.md` §3) | Task(s) |
|---|---|---|
| A1 | Answer leak in WebSocket | P3.1 |
| A2 | Back to Lobby shows Round 4/3 | P1.1, P1.3, P1.4 |
| A3 | No answer reveal on timeout | P2.4 |
| A4 | Start without all Ready | P2.1 |
| A5 | Start alone / Team with empty team | P2.2 |
| A6 | Drawer can chat | P3.2 |
| A7 | Timer stops counting | P2.5 |
| A8 | Review/repair Solo AI code path | P7.1 |
| A9 | AI shows a word while not confident | P7.2 |
| B1 | Page scrolls while drawing | P5.1 |
| B2 | Mobile/iPad layout | P5.2 |
| B3 | PIN boxes need tapping one by one | P5.3 |
| B4 | Refresh kicks to Home (reconnect) | P4.1 |
| B5 | Socket connects to `localhost` | P5.4 |
| C1 | Default name "กกก" | P6.1 |
| C2 | README commands that do not exist | P6.2 |
| C3 | Port in use crashes silently | P6.3 |
| C4 | Avatars 👾 🚀 missing | P6.4 |
| D1 | Words by Easy/Medium/Hard | P6.5 |
| D2 | Real partial eraser | P7.3 |
| D3 | Challenge / Don't Lift Pen popup | P7.4 |

No requirement is Deferred or Removed.

## 2. Original 14-bug mapping (team bug report)

| Bug | Requirement | Current status (code reading) | Evidence |
|---|---|---|---|
| BUG-01 Leave Lobby shows Round 4/3 | A2 | OPEN | ARCH §6.1; HANDOFF A2; QA F-02 FAIL (claim) |
| BUG-02 Starts without all Ready | A4 | OPEN | ARCH §3.2; HANDOFF A4 |
| BUG-03 Solo vs AI mode | **A8/A9 — NEEDS HUMAN CONFIRMATION** | A8/A9 implemented (P7.1/P7.2); mapping itself still unconfirmed | Bug text is too broad to map with certainty; A8/A9 are the only Solo AI requirements. Do not force the mapping. |
| BUG-04 Team mode with one player | A5 | OPEN | ARCH §3.2; HANDOFF A5; QA H-03 FAIL (claim) |
| BUG-05 Challenge / Don't Lift Pen popup | D3 | OPEN (inline banner + `alert()`) | ARCH §10; HANDOFF D3 |
| BUG-06 Phone / iPad screen sizes | B2 | UNCERTAIN (QA UI-01 PASS is hardcoded) | HANDOFF B2 |
| BUG-07 Answer visible via F12 | A1 | OPEN | ARCH §8; QA SEC-01 FAIL (claim) |
| BUG-08 Drawer can type in chat | A6 | OPEN | ARCH §3.2, §8.1; QA G-04 FAIL (claim) |
| BUG-09 Word difficulty Easy/Medium/Hard | D1 | OPEN (field exists, unused) | ARCH §9 |
| BUG-10 Default name "กกก" | C1 | OPEN | `client/src/App.jsx:13`; HANDOFF C1 |
| BUG-11 Timeout should reveal answer | A3 | PARTIAL (payload yes, UI no) | ARCH §8; QA T-04 PASS is payload-only |
| BUG-12 Page scrolls while drawing | B1 | OPEN | ARCH §12 |
| BUG-13 Refresh kicks to Home | B4 | OPEN — feature not implemented | ARCH §14 |
| BUG-14 PIN requires clicking each box | B3 | OPEN | `client/src/App.jsx:457-497` |

Requirements with no original bug: A7, B5, C2, C3, C4, D2 (from QA/HANDOFF).

**Numbering warning:** `HANDOFF.md` C2/C3/C4 cite "BUG-05/06/07" from `qa/QA_REPORT.md`. Those are **not** the team's BUG-05/06/07 above. Always qualify bug IDs with their source.

## 3. Sequencing and parallelism

- Phase 1 before Phase 2/3 (state machine and contract are shared foundations).
- P1.3 (end of game) and P2.3 (between rounds) are separate tasks and separate commits.
- P3.1 (A1) and P4.1 (B4) both touch per-role state payloads — do P3.1 first; P4.1 must reuse its visibility logic.
- **B4 before B5:** discovery shows both touch `client/src/services/socket.js` / client connection setup. Implement and verify P4.1 first, then P5.4. Parallelize only if task-level discovery proves no shared files.
- Phase 5 tasks may run in parallel with server work only if they touch different files and no contracts.
- Every parallel task uses its own branch, e.g. `game/A2`, `security/A1`, `mobile/B1`, `mobile/B2`, `mobile/B3`, `network/B5`, `session/B4`, `game/A7`.
- Before merge: inspect `git diff`, resolve conflicts deliberately, run relevant tests, verify no unrelated files, get human approval.

---

## Phase 0 — Documentation

### DOC-0 — Project control documents

- **Task ID:** DOC-0
- **Requirement IDs:** — (process)
- **Goal:** Add `AGENTS.md`, `ARCHITECTURE.md`, `TASKS.md`, `CLAUDE.md` (contains only `@AGENTS.md`).
- **Current problem:** No control documents existed.
- **Discovery requirements:** Done (read-only discovery gate).
- **Allowed files:** `AGENTS.md`, `ARCHITECTURE.md`, `TASKS.md`, `CLAUDE.md`
- **Forbidden changes:** Any application source, config, package, or QA file; deleting dead code.
- **Implementation requirements:** Documentation only.
- **Acceptance criteria:** Human review approves all four files.
- **Test procedure:** `git status` shows only the four new files.
- **Regression requirements:** None (no code change).
- **Commit requirement:** After approval only — stage exactly these four files, verify with `git diff --cached --stat`, one commit `docs: add project control documents`. **Committed: `853c0be`.**

---

## Phase 1 — Shared contract + game end

### P1.1 — Focused discovery: state machine and round counter

- **Task ID:** P1.1
- **Requirement IDs:** A2 (discovery)
- **Goal:** Confirm exactly how rounds, turns, `currentRound`, and the end-of-game boundary behave, to scope P1.3 and P2.3.
- **Current problem:** `currentRound++` happens before the `totalRounds` check; no `GAME_OVER → LOBBY` path; "BACK TO LOBBY" is client-only (ARCH §6, §6.1).
- **Discovery requirements:** Read only the state machine path: `RoundManager.js`, `TimerManager.js`, `start_game`/leave/disconnect in `gameHandler.js`, `chatHandler.js` round-end trigger, Solo AI round-end trigger, client handling of `room_data.status`, `game_over`, and the result modal. Do **not** repeat full-repo discovery. Determine: effect of players leaving on `drawerIndex`; effect of the uncancellable 4 s `setTimeout`; what the client needs to return to lobby.
- **Allowed files:** None (read-only). Output: findings appended to this task + verified file list for P1.3/P2.3.
- **Forbidden changes:** Any file change.
- **Implementation requirements:** —
- **Acceptance criteria:** Written findings with file:line evidence; proposed allowed-file list for P1.3 and P2.3; list of any contract change needed (event/payload) flagged for approval.
- **Test procedure:** Optional non-mutating runtime observation (only if dependencies are already installed — installing requires approval).
- **Regression requirements:** —
- **Commit requirement:** None, or a docs-only update to `TASKS.md` if approved.
- **Status:** Done. Findings (code reading at `853c0be`), recorded with the P1.3 commit:
  - `currentRound++` ran before the `totalRounds` check (`RoundManager.js` `endRound`), so `endGameMatch` broadcast `currentRound = totalRounds + 1`.
  - No `GAME_OVER → LOBBY` path existed; the START button lives only in `RoomLobby` (shown in `LOBBY`), so a finished room was stuck.
  - The 4 s ROUND_OVER `setTimeout` was not stored: START during ROUND_OVER could double-start a turn, and an emptied seed room `83921` could be turned into `GAME_OVER` by the stale timeout.
  - Out of P1.3 scope, left for later tasks: `start_game` status guard (U3 → P2.1), `drawerIndex` not adjusted on leave and drawer-leaves-mid-round (→ P2.3), header logo click leaves the room client-side only without `leave_room` (new: U8).
  - Decision (human): Option A — server auto-returns to `LOBBY` after `GAME_RULES.GAME_OVER_DELAY_MS` (10 s); no new socket event.

### P1.2 — Make `shared/contract.js` a real runtime source of truth

- **Task ID:** P1.2
- **Requirement IDs:** Architectural gap (ARCH §4); prerequisite for A2–A6, B3, B4, D1, A8/A9 using shared values.
- **Goal:** `shared/contract.js` can be imported by both the CommonJS server and the Vite client, and the values needed by Phase 1–3 tasks are read from it instead of hardcoded.
- **Current problem:** `contract.js` is CommonJS-only and imported by nothing; status strings, rules, AI words/thresholds, PIN length are hardcoded or duplicated (ARCH §4).
- **Discovery requirements:** Determine how `events.js`/`gameConfig.js` load in both runtimes; decide the minimal module format change; list every place each needed value is hardcoded; check whether any `contract.js` value conflicts with current behaviour (e.g. `WORD_DIFFICULTY` uppercase vs lowercase in `database.js`, Solo AI payload shape).
- **Allowed files:** TBD after read-only discovery. Candidate: `shared/contract.js` plus client consumers. Note: since P1.3 the server already `require`s `contract.js` (`RoundManager.js`); remaining scope is client loadability and migrating other hardcoded values.
- **Forbidden changes:** Changing any value's meaning; changing socket event names/payloads; deleting `constants.js` or other duplicates (dead-code cleanup is out of scope); bulk replacement of hardcoded values unrelated to an active task.
- **Implementation requirements:** **Approval required** (modifies `shared/`). Smallest change that lets both runtimes import `contract.js`. Adopt values incrementally — each later task switches only the values it touches.
- **Acceptance criteria:** Server starts and client builds/loads with `contract.js` imported on the live path; no behaviour change; no duplicate competing value introduced.
- **Test procedure:** Start server (`npm run dev` in `server/`), start client (`npm run dev` in `client/`), confirm no load errors in server log and browser console; play one round.
- **Regression requirements:** Room create/join, start, draw, guess, round end still work.
- **Commit requirement:** `refactor(P1.2): load shared contract on live path` — one commit.
- **Status:** Done (approved by human).
  - Allowed files used: `shared/contract.js`, `client/src/App.jsx`.
  - Change: `contract.js` now uses the same dual pattern as `shared/events.js` — `export const` / `export function` plus a guarded `module.exports`. Server keeps `require()` (Node require(esm), as for the other shared files); client imports it as ESM. First client consumer: `GAME_STATUS.LOBBY` in `App.jsx` (replaces the literal added in P1.3). No value changed.
  - Checks: CJS `require` from `server/src/gameLogic` PASS; ESM `import` PASS; client `vite build` PASS (contract bundled); server startup PASS; P1.4 e2e 13/13 PASS; harness 20/20 PASS.
  - Note: like the other shared files, loading via `require()` depends on Node's require(esm) support (verified on Node v24.18.0).

### P1.3 — End-of-game transition (A2)

- **Task ID:** P1.3
- **Requirement IDs:** A2 (BUG-01)
- **Goal:** `ROUND_OVER → GAME_OVER → LOBBY` works; no Round 4/3 when `totalRounds = 3`.
- **Current problem:** ARCH §6.1 — counter overshoot, no server event to return to lobby, modal button is client-only.
- **Discovery requirements:** Use P1.1 output. Check whether an existing event can carry "return to lobby" before proposing a new one.
- **Allowed files (approved after P1.1):** `shared/contract.js`, `server/src/gameLogic/RoundManager.js`, `server/src/gameLogic/TimerManager.js`, `client/src/App.jsx`.
- **Forbidden changes:** Between-round logic (P2.3); ready/min-player validation (P2.1/P2.2); timer redesign; unrelated UI.
- **Implementation requirements:** Final round ends in `GAME_OVER` without ever exposing `currentRound > totalRounds`; timer stopped and pending transitions cannot fire after `GAME_OVER`; a server-authoritative path returns the room to `LOBBY` (who may trigger it — host or each player — must be stated in discovery and approved if it adds/changes an event). A new socket event requires approval.
- **Acceptance criteria:** See P1.4 checklist.
- **Test procedure:** 2+ clients, `totalRounds = 3`, play to the end, press the return button, observe all clients and WebSocket frames.
- **Regression requirements:** P1.4.
- **Commit requirement:** `fix(P1.3): fix game over transition`.
- **Status:** Done.
  - Implemented: `GAME_RULES.GAME_OVER_DELAY_MS = 10000` in `shared/contract.js` (first runtime import of `contract.js`, server only); `TimerManager.scheduleTransition()/clearTransition()` with `stopTimer()` also clearing the pending transition; `endRound` never increments past `totalRounds`; `endGameMatch` schedules `returnToLobby()`, which resets round/score/ready state and emits `room_data` + `room_list_updated`; result-modal button is `LEAVE ROOM` → existing `leave_room` → Home; modal closes automatically when `room_data.status` becomes `LOBBY` (option (a), chosen to let players stay in the room).
  - Checks: `node --check` PASS (3 files); `GAME_OVER_DELAY_MS` resolves to `10000` at runtime PASS; server startup PASS; client `vite build` PASS; fake-clock state-machine harness 20/20 PASS (baseline negative control 11/20); real-server 2-socket e2e 6/6 PASS. Harness/e2e scripts were run from a scratch directory, not committed.
  - MANUAL 2-tab browser test: NOT TESTED.

### P1.4 — A2 regression

- **Task ID:** P1.4
- **Requirement IDs:** A2
- **Goal:** Verify P1.3 end-to-end.
- **Current problem:** —
- **Discovery requirements:** Identify which existing QA scripts (F-01, F-02, F-04) can be reused and whether they assert real outcomes.
- **Allowed files:** TBD (test files only, if new tests are written; location needs approval if a new folder is required).
- **Forbidden changes:** Application source.
- **Implementation requirements:** Record actual results.
- **Acceptance criteria:**
  - no Round 4/3 at any point;
  - final round ends correctly;
  - timer stops after `GAME_OVER` (no further `timer_tick`);
  - room returns to `LOBBY`;
  - round state (`currentRound`, `drawerIndex`, drawer, word, challenge) resets on return to `LOBBY`;
  - ready state resets on return to `LOBBY`;
  - scores remain available during `GAME_OVER` for the Result/Podium;
  - scores are cleared **only** on return to `LOBBY` / new-game initialization;
  - a new game requires players to Ready again (effective once P2.1 lands; record status before/after);
  - a new game begins at Round 1.
- **Test procedure:** Manual 2–3 client run plus WebSocket frame capture; mark any unautomated item `MANUAL`.
- **Regression requirements:** Leave/rejoin (F-03/F-04), host transfer.
- **Commit requirement:** Test-only commit if tests were added: `test(P1.4): A2 regression`.
- **Status:** Done (automated), recorded at commit `4aa38b6` + this update. No test files were added to the repo (location for new tests needs approval); scripts ran from a scratch directory.
  - Existing QA reuse: `qa/test_f_cases.js` targets the old "BACK TO LOBBY" text and F-04 is a hardcoded `PASS`; `qa/` dependencies are not installed. Not reusable without changes to `qa/` (not approved).
  - Evidence: real server on :4000 + real `socket.io-client` sockets (e2e, 13/13 PASS) and a fake-clock harness over the live server modules (20/20 PASS).

  | Criterion | Result | Evidence |
  |---|---|---|
  | No Round 4/3 | PASS | e2e R1 (total 1, max 1), R2 (total 2, max 2); harness S1 (total 3, max 3) |
  | Final round ends correctly | PASS | e2e R2: 4 ROUND_OVER then GAME_OVER (2 players × 2 rounds) |
  | Timer stops after GAME_OVER | PASS | e2e R1: 0 `timer_tick` during GAME_OVER |
  | Room returns to LOBBY | PASS | e2e R1/R3: LOBBY 10.0 s after GAME_OVER |
  | Round state resets on LOBBY | PASS | e2e R1 + harness S1 (round 0, drawer null, word '') |
  | Ready state resets on LOBBY | PASS (harness only) | harness S1 true→false; e2e cannot show it because START does not require Ready yet (A4) |
  | Scores available during GAME_OVER | PASS | e2e R1: `room_data` + `game_over.finalScores` non-zero |
  | Scores cleared only on LOBBY / new game | PASS | e2e frames: scores unchanged until the LOBBY frame |
  | New game requires Ready again | PASS (after P2.1) | e2e R1: `start_game` after LOBBY rejected until the guest is Ready again |
  | New game begins at Round 1 | PASS | e2e R1: first WORD_SELECTION after LOBBY has round 1, scores 0 |
  | Regression: leave during GAME_OVER / host transfer | PASS | e2e R3: host leaves, remaining player becomes host, LOBBY at 10.0 s |
  | Regression: everyone leaves during GAME_OVER | PASS | e2e R4: room removed, no late callback, server responsive |
  | MANUAL 2-browser test | NOT TESTED | see Phase 1 checklist in the phase report |

---

## Phase 2 — Server game core

### P2.1 — Ready validation (A4)

- **Task ID:** P2.1
- **Requirement IDs:** A4 (BUG-02)
- **Goal:** Server rejects `start_game` when required players are not ready.
- **Current problem:** No ready check; START button always enabled (ARCH §3.2).
- **Discovery requirements:** Confirm `GAME_RULES.REQUIRE_ALL_READY` semantics ("host does not need to press Ready"); how rejection is reported to the client with the existing contract; whether `start_game` should also be rejected outside `LOBBY` (see Unassigned findings U3).
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Min-player rules (P2.2); payload changes without approval.
- **Implementation requirements:** Server is authoritative; client START disabled state reads the same shared rule (UX only).
- **Acceptance criteria:** With any non-host player not ready, the START button is disabled **and** a direct `start_game` emit does not start the game.
- **Test procedure:** UI test + direct socket emit from a script; capture result.
- **Regression requirements:** Normal start with all ready; P1.4 "new game requires Ready".
- **Commit requirement:** `fix(P2.1): enforce ready validation`.
- **Status:** Done (automated); MANUAL NOT TESTED.
  - Files: `server/src/socket/gameHandler.js`, `client/src/components/RoomLobby.jsx`.
  - Server: `getStartBlockReason()` rejects `start_game` unless `room.status === GAME_STATUS.LOBBY` (also closes U3) and, when `GAME_RULES.REQUIRE_ALL_READY`, every non-host player is ready. Rejection is reported to the host only, via the existing `chat_message` system-message shape (no contract change).
  - Client: START disabled with a "Waiting for: …" hint using the same `GAME_RULES` (UX only).
  - Checks: e2e 8/8 PASS (not-ready reject + reason, ready start, START during PLAYING ignored, non-host ignored, host need not be ready, Solo AI alone starts); A2 e2e 14/14 PASS; harness 20/20; build PASS; server startup PASS.

### P2.2 — Minimum-player validation (A5)

- **Task ID:** P2.2
- **Requirement IDs:** A5 (BUG-04)
- **Goal:** Server rejects invalid FFA and Team starts.
- **Current problem:** 1 player can start FFA/Team (ARCH §3.2).
- **Discovery requirements:** Rules from `GAME_RULES.MIN_PLAYERS_FFA`, `MIN_PLAYERS_PER_TEAM`, `MIN_PLAYERS_TEAM_TOTAL`; confirm Solo AI is exempt.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Ready logic beyond integration with P2.1.
- **Implementation requirements:** Shared values only; server authoritative; client UX disable.
- **Acceptance criteria:** 1 player FFA cannot start; Team with an empty team cannot start (button and direct emit); Solo AI still starts alone.
- **Test procedure:** UI + direct emit.
- **Regression requirements:** Valid starts in all three modes.
- **Commit requirement:** `fix(P2.2): enforce minimum players`.
- **Status:** Done (automated); MANUAL NOT TESTED.
  - Files: `server/src/socket/gameHandler.js`, `client/src/components/RoomLobby.jsx`.
  - Server `getStartBlockReason()`: FFA needs `GAME_RULES.MIN_PLAYERS_FFA`; TEAM needs `MIN_PLAYERS_TEAM_TOTAL` and `MIN_PLAYERS_PER_TEAM` on both Red and Blue; Solo AI exempt. Client START hint uses the same shared values.
  - Deadlock fix inside scope: there is no team-switch UI, so when the host switches an existing room to TEAM in the lobby the server now alternates players Red/Blue (`update_room_settings`). Joins into a TEAM room were already balanced.
  - Checks: e2e 9/9 PASS (FFA alone rejected + reason, TEAM empty team rejected, join balances, 1v1 starts, both-on-Red rejected by direct emit, FFA→TEAM rebalance then start, FFA 2 ready starts); P2.1 8/8; A2 14/14; harness 20/20; build; startup.
  - Known gap: no client UI for `switch_team`; if a player leaves and empties a team in the lobby, the room cannot start until someone joins (U9).

### P2.3 — Between-round transition

- **Task ID:** P2.3
- **Requirement IDs:** Game core (supports A2, A3, A7)
- **Goal:** `ROUND_OVER → WORD_SELECTION → PLAYING` is correct and separate from the end-of-game path (P1.3).
- **Current problem:** Uncancellable `setTimeout`; `drawerIndex` not adjusted when players leave; `currentWord` not cleared at `WORD_SELECTION` (ARCH §6, §8).
- **Discovery requirements:** Use P1.1 output.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** End-of-game logic already fixed in P1.3 (except integration); timer redesign (P2.5).
- **Implementation requirements:** correct next drawer; round timer reset; round-specific state reset (correct guessers, drawing, challenge, word); next word selection; `totalRounds` enforced; never enter `GAME_OVER` early.
- **Acceptance criteria:** 3 players × 3 rounds: each player draws once per round in order; 9 turns then `GAME_OVER`; no early or extra rounds; state reset each turn.
- **Test procedure:** Multi-client run with logged `round_change`/`room_data`.
- **Regression requirements:** P1.4.
- **Commit requirement:** `fix(P2.3): fix between-round transition`.
- **Status:** Done (automated); MANUAL NOT TESTED.
  - Files: `server/src/gameLogic/RoundManager.js`, `server/src/socket/gameHandler.js`.
  - `RoundManager.handlePlayerRemoved()` (called from `handlePlayerLeave` after removal): shifts `drawerIndex` when an earlier player leaves; if the drawer leaves during WORD_SELECTION/PLAYING the turn ends ("The drawer left the room.") and the next player draws; if the remaining guessers have all guessed, the round ends.
  - `startTurnSelection()`: if `drawerIndex >= players.length` (next drawer left during ROUND_OVER) the round is closed there (next round, or GAME_OVER at `totalRounds`); clears `currentWord` at WORD_SELECTION (stale word no longer carried).
  - Empty seed room `83921` now resets via `returnToLobby()` (full round/score reset) instead of status only.
  - Checks: e2e 11/11 PASS (3 players × 2 rounds order A,B,C,A,B,C / rounds 1,1,1,2,2,2; WORD_SELECTION resets guessers + word; PLAYING timer restarts at 60 each turn; drawer leaves → next player; earlier player leaves in ROUND_OVER → order kept; next drawer leaves in ROUND_OVER → round 2 starts; last guesser leaves → round ends); P2.2 9/9; P2.1 8/8; A2 14/14; harness 20/20; build; startup.
  - Not covered: client keeps a stale `chosenWord` for a returning drawer during WORD_SELECTION (`MultiplayerGame.jsx`/`TeamGame.jsx`, display only) — left for P3.1 client changes; U8 ghost player (header logo) unchanged.

### P2.4 — Timeout reveal (A3)

- **Task ID:** P2.4
- **Requirement IDs:** A3 (BUG-11)
- **Goal:** When nobody guesses before timeout, `PLAYING → ROUND_OVER` and the answer is visible to all players in the UI.
- **Current problem:** `round_end.word` is sent but no client listens; guesser UI always shows underscores (ARCH §8).
- **Discovery requirements:** Which existing payload the UI should use for the reveal (`round_end` or `room_data` in `ROUND_OVER`) consistent with P3.1 visibility rules.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Revealing the word in any other state.
- **Implementation requirements:** Coordinate with P3.1 (reveal only in `ROUND_OVER`/`GAME_OVER`).
- **Acceptance criteria:** Timeout with no correct guess → every client visibly shows the answer during `ROUND_OVER`.
- **Test procedure:** 2 clients, wait for timeout, screenshot both + frames.
- **Regression requirements:** All-guessed early end still reveals; P3.1 leak checks.
- **Commit requirement:** `fix(P2.4): reveal answer on timeout`.
- **Status:** Done (automated); MANUAL NOT TESTED.
  - Files: `client/src/gameModes/MultiplayerGame.jsx`, `client/src/gameModes/TeamGame.jsx`. No server or contract change: the server already sends the word in `round_end` and in `room_data` during ROUND_OVER.
  - UI shows the answer to everyone only when `status` is in `GAME_RULES.REVEAL_WORD_STATUSES` (badge "THE ANSWER WAS" + "The word was …" banner in ROUND_OVER). Drawer badge no longer shows a stale `chosenWord` during WORD_SELECTION.
  - Checks: server e2e 4/4 PASS (timeout with no guesses: reason "Time is up!", guesser gets the word in `round_end` and ROUND_OVER `room_data`, drawer 0 pts); component render test 8/8 PASS (FFA + Team: guesser sees answer in ROUND_OVER, blanks in PLAYING; drawer sees word in PLAYING and "SELECTING WORD" in WORD_SELECTION); all earlier suites PASS; build PASS.
  - Render tests bundle the real components with esbuild (already in `client/node_modules`) and `react-dom/server`, with the socket module stubbed; they are not a browser test.

### P2.5 — Timer verification / fix (A7)

- **Task ID:** P2.5
- **Requirement IDs:** A7
- **Goal:** Prove (or fix) that the timer counts down correctly across rounds.
- **Current problem:** Status `UNCERTAIN`; existing T-02 evidence shows identical values (ARCH §6.2).
- **Discovery requirements:** Review `TimerManager.js`, `useGameTimer.js`, `TimerBadge.jsx`; define the project's accepted sync tolerance (needs human value if none exists).
- **Allowed files:** TBD after read-only discovery (none if verification passes).
- **Forbidden changes:** Redesigning the timer without a failing observation.
- **Implementation requirements:** Fix only if a defect is observed.
- **Acceptance criteria:** timer decreases during `PLAYING`; reaches 0 when the round ends by timeout; resets at each new round; clients synchronized within tolerance; continues for ≥ 3 consecutive rounds without refresh. Evidence must show **decreasing values over time** (e.g. samples every 5 s per HANDOFF A7), not identical screenshots.
- **Test procedure:** Log `timer_tick` values with timestamps on 2 clients over 3 rounds.
- **Regression requirements:** P1.4 (timer stops after `GAME_OVER`).
- **Commit requirement:** `fix(P2.5): fix timer synchronization` (or `test(P2.5): ...` if verification only).
- **Status:** Done — verification only, no defect found, no code change. MANUAL (on-screen timer) NOT TESTED.
  - Tolerance used: ≤ 1 s between clients (QA plan T-01 criterion; no other project value exists).
  - Evidence (real server, 2 sockets, 3 rounds × 2 players, `roundTime` 5, no refresh): every PLAYING turn ticked `5,4,3,2,1,0`; tick spacing 1000–1004 ms; 0 reached on timeout in all 6 turns; max client skew 1 ms. Sample (client A, value@ms): `5@0 4@1002 3@2002 2@3004 1@4006 0@5006`.
  - The test created the room with `roundTime: 5` through `create_room`, which is not clamped (only `update_room_settings` clamps 15–180) — recorded as U10.

---

## Phase 3 — Security

### P3.1 — Answer leakage (A1)

- **Task ID:** P3.1
- **Requirement IDs:** A1 (BUG-07)
- **Goal:** Guessers cannot obtain the answer from any client-visible data.
- **Current problem:** One `room_data` with `currentWord` is broadcast to all (ARCH §8).
- **Discovery requirements:** Every emit that includes room state or the word (`room_data`, `round_end`, `draw_sync`, chat, logs); how to deliver per-role state with the existing event (`GAME_RULES.REVEAL_WORD_STATUSES`); impact on drawer UI and Solo AI.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Event renames; payload shape changes without approval (omitting `currentWord` for guessers is a payload-meaning change → approval).
- **Implementation requirements:**
  - `WORD_SELECTION`: guesser does not receive `currentWord` (including a stale value);
  - `PLAYING`: guesser does not receive `currentWord`; may receive `wordLength`;
  - `ROUND_OVER`: word may be revealed;
  - `GAME_OVER`: reveal according to the actual Result UI;
  - correct guess: others receive only a neutral notice (keep current behaviour, ARCH §8.1); the guessed text is never broadcast;
  - candidate words are sent only to the drawer (keep current behaviour; verify);
  - mid-game joiners get the same per-role view.
- **Acceptance criteria:** WebSocket frame inspection on a guesser client shows no answer and no candidate words during `WORD_SELECTION`/`PLAYING`, including after correct guesses, joins, ready toggles, and team switches.
- **Test procedure:** DevTools/Playwright frame capture filtered for the word and for `currentWord`.
- **Regression requirements:** Drawer still sees the word; P2.4 reveal; scoring.
- **Commit requirement:** `fix(P3.1): prevent answer leakage`.
- **Status:** Done (automated); MANUAL DevTools check NOT TESTED.
  - **Contract change (pre-approved by human):** `room_data` is now role-based. Same event name and fields; `currentWord` is `''` for any viewer who is not the current drawer unless `status` is in `GAME_RULES.REVEAL_WORD_STATUSES` (`ROUND_OVER`, `GAME_OVER`). `wordLength` unchanged. Sent per player via `RoomManager.emitRoomData()` instead of one room broadcast.
  - Files: `server/src/gameLogic/RoomManager.js` (`canSeeWord`, `sanitizeRoom(room, t, viewer)`, `emitRoomData`), `server/src/gameLogic/RoundManager.js`, `server/src/socket/gameHandler.js`, `server/src/socket/chatHandler.js` (all `room_data` emits switched). 4 server files, within the pre-approved contract change. Client consumers needed no change: they already treat `''` as "no word" (verified by the P2.4 render test).
  - Already correct, verified: candidate words go only to the drawer (`word_selection`); correct-guess notice is neutral; `round_start`/`round_change`/`game_over` carry no word.
  - Checks: leak e2e 7/7 PASS — every event received by every non-drawer during WORD_SELECTION/PLAYING scanned for the answer and for the other candidates (141 events, 3 drawers, incl. after a correct guess and a mid-game join): 0 leaks; drawer still gets the word; non-drawers get it in ROUND_OVER; `wordLength` kept. All earlier suites PASS (A2 e2e now guesses via a test oracle instead of the leaked word).
  - Test note (found while running D2): the leak scan's per-turn window was based on the drawer's receive time, so a legitimate ROUND_OVER frame that reached another socket 1 ms earlier was flagged once. Window now ends at each player's own `round_end`; 5 consecutive runs 7/7 PASS. No code issue.
  - Remaining indirect channel (by design, not a leak to non-guessers): chat from players who already guessed is delivered only to the drawer and other correct guessers (`isConcealedChat`).

### P3.2 — Drawer chat restriction (A6)

- **Task ID:** P3.2
- **Requirement IDs:** A6 (BUG-08)
- **Goal:** The drawer cannot send chat during the round.
- **Current problem:** Drawer messages are broadcast (`chatHandler.js:70-74`); chat input always enabled (`ChatBox.jsx`).
- **Discovery requirements:** Which states are covered (`PLAYING` at minimum; decide `WORD_SELECTION`); `GAME_RULES.DRAWER_CAN_CHAT`.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Guessing/scoring logic.
- **Implementation requirements:** Server rejects; client disables input (UX).
- **Acceptance criteria:** Drawer cannot type in the UI, and a direct `send_chat` from the drawer is not delivered to anyone.
- **Test procedure:** UI + direct emit + frame check on guesser.
- **Regression requirements:** Guessers chat/guess normally; concealed chat for correct guessers.
- **Commit requirement:** `fix(P3.2): block drawer chat`.
- **Status:** Done (automated); MANUAL NOT TESTED.
  - States covered: WORD_SELECTION and PLAYING (WORD_SELECTION included so the drawer cannot post the candidate words). Drawer may chat in LOBBY / ROUND_OVER / GAME_OVER.
  - Files: `server/src/socket/chatHandler.js` (drops the message, replies to the drawer with a system notice via the existing `chat_message` shape; `GAME_RULES.DRAWER_CAN_CHAT`), `client/src/components/ChatBox.jsx` (input + SEND disabled, placeholder explains; UX only).
  - Checks: e2e 5/5 PASS (drawer chat in WORD_SELECTION and the answer in PLAYING not delivered; notice to drawer; guesser chat still delivered; drawer chat works in ROUND_OVER); render 4/4 PASS; leak e2e 7/7; A2 14/14; harness; build; startup.

---

## Phase 4 — Session / reconnect

### P4.1 — Refresh / reconnect (B4)

- **Task ID:** P4.1
- **Requirement IDs:** B4 (BUG-13)
- **Goal:** Refreshing during a game reconnects the player to the same room/player slot within the grace period.
- **Current problem:** **No reconnect/session implementation exists** — player removed on disconnect; client keeps room only in React state (ARCH §14).
- **Discovery requirements:** Identity model (username-based today, ARCH §3.3); where a grace timer would live; drawer/host disconnect behaviour; shared files with B5 (`services/socket.js`).
- **Allowed files:** TBD after read-only discovery. Likely > 3 files → approval required.
- **Forbidden changes:** New session framework if the existing structure can be extended; changing visibility rules.
- **Implementation requirements:** Use `GAME_RULES.RECONNECT_GRACE_MS`; client persists only what is needed (HANDOFF suggests room id + name in `sessionStorage`); reconnect state uses the **same server-side visibility rules as P3.1**.
- **Acceptance criteria:**
  - refresh mid-game → same room, same score, within grace;
  - after grace expiry the player is removed as today;
  - reconnected guesser does not receive `currentWord` in `WORD_SELECTION`/`PLAYING`;
  - no generic/full snapshot request returns the answer to a guesser;
  - drawer receives drawer-only data; non-drawers do not.
- **Test procedure:** Refresh guesser and drawer mid-round; frame capture after reconnect.
- **Regression requirements:** P3.1; leave/host transfer; P1.4.
- **Commit requirement:** `feat(B4): restore reconnect session`.
- **Status:** Done (automated); MANUAL browser refresh NOT TESTED.
  - **Contract changes (pre-approved, minimal, required for reconnect):**
    - New event `rejoin_room` (`SOCKET_EVENTS.REJOIN_ROOM`, C→S) payload `{ code, sessionId }`, ack `{ success, roomId, code, username, avatar }` or `{ success: false, message }`.
    - New ack field `sessionId` on the existing `create_room` and `join_room` acks.
  - Server (`gameHandler.js`): each player gets a random `sessionId` (crypto, 128-bit); `disconnect` no longer removes the player — the slot is kept for `GAME_RULES.RECONNECT_GRACE_MS` (30 s), then removed through the same path as a leave (turn order / drawer-left handling from P2.3). Explicit `leave_room` still removes immediately. `rejoin_room` rebinds the socket, re-sends `room_data` through `emitRoomData` (same role-based rules as P3.1) and re-sends `word_selection` only to the drawer during WORD_SELECTION. A same-name `join_room` rotates the `sessionId` (old session stops working).
  - Client: `App.jsx` stores `{ code, sessionId }` in `sessionStorage` (per tab, try/catch) on create/join, emits `rejoin_room` on every socket `connect` (page load and socket.io auto-reconnect), clears it on LEAVE / failed rejoin; `RoomList.jsx` passes the join ack up. `shared/events.js` adds `REJOIN_ROOM`.
  - Files: `server/src/socket/gameHandler.js`, `shared/events.js`, `client/src/App.jsx`, `client/src/components/RoomList.jsx`.
  - Checks: e2e 20/20 PASS — sessionId issued; guesser refresh mid-PLAYING returns to the same room/state, score kept, no answer in any event after rejoin, `wordLength` kept, can still guess; drawer refresh in WORD_SELECTION gets its candidates again (guesser never does), keeps host, sees the word in PLAYING; unknown / malformed / post-leave sessions rejected; disconnected drawer kept during grace, removed at 30.0 s with the turn ended and host passed on; same-name join invalidates the old session. All earlier suites PASS.
  - Client flow (headless Chrome, real `App`, stubbed socket with acks): 6/6 PASS — stored session → `rejoin_room {code, sessionId}` on load and the game screen returns; LEAVE clears the session and emits `leave_room`; a failed rejoin clears the session and stays on Home; `create_room` ack stores `{code, sessionId}`; a socket `connect` (auto-reconnect) re-emits `rejoin_room`.
  - Not covered by automation: a real browser reload against the real server (end to end) — MANUAL. W1 "score preserved" was checked at score 0 only; the rejoined player scoring afterwards was checked.
  - Known limits: identity is still username-based for `join_room` (U1); while a player is disconnected they still count as a guesser / can still be the drawer until the grace expires.

---

## Phase 5 — Mobile / network

### P5.1 — Touch drawing without page scroll (B1)

- **Task ID:** P5.1
- **Requirement IDs:** B1 (BUG-12)
- **Goal:** Drawing with a finger/stylus does not scroll or zoom the page.
- **Current problem:** Mouse/touch handlers, no `preventDefault`, no live `touch-action` (ARCH §12).
- **Discovery requirements:** `Canvas.jsx` input handlers; coordinate scaling (`getCanvasCoords`); DONT_LIFT_PEN interaction.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Canvas redesign; eraser work (P7.3).
- **Implementation requirements:** Pointer Events; `touch-action: none` on the live canvas; coordinates map correctly at any displayed size.
- **Acceptance criteria:** On a real phone and iPad, drawing does not scroll/zoom and strokes appear under the finger; remote clients see the same strokes.
- **Test procedure:** Real devices (`MANUAL`); desktop mouse regression.
- **Regression requirements:** Geometric shapes, ghost preview, DONT_LIFT_PEN, Solo AI pixel capture.
- **Commit requirement:** `fix(B1): pointer events touch drawing`.
- **Status:** Implemented; touch behaviour on real phone/iPad NOT TESTED (MANUAL).
  - File: `client/src/components/Canvas.jsx`.
  - Mouse + touch handlers replaced by Pointer Events (`onPointerDown/Move/Up/Leave/Cancel`, primary pointer only, `preventDefault` on down); `touch-action: none` on the canvas container and drawing canvas. `pointerleave` still ends the stroke (keeps the existing DONT_LIFT_PEN "leaving the canvas counts as lifting" behaviour).
  - `getCanvasCoords` now scales client coordinates to the fixed 640×480 canvas space, so strokes land under the finger/cursor at any displayed size and remote clients receive the same coordinate space (previously CSS pixels).
  - Checks: render test 3/3 PASS (`touch-action:none` on container + drawing canvas, 640×480 kept); no mouse/touch handlers left; client build PASS.
  - **Added evidence (headless Chrome, recorded with D2):** computed `touch-action: none`; synthetic touch-type PointerEvents on a canvas displayed at 320 px land at canvas (320,240) and are emitted in 640×480 space. Real finger/stylus scrolling and zoom on iOS/Android remain MANUAL.

### P5.2 — Responsive layout (B2)

- **Task ID:** P5.2
- **Requirement IDs:** B2 (BUG-06)
- **Goal:** All live screens usable at ~375 px and on iPad with no overflow (HANDOFF: canvas on top, chat below).
- **Current problem:** `UNCERTAIN` — QA UI-01 PASS is hardcoded.
- **Discovery requirements:** Measure each live screen at 375 px / iPad widths.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Visual redesign beyond overflow/layout fixes.
- **Implementation requirements:** Layout-only changes.
- **Acceptance criteria:** No horizontal overflow or clipped controls on Home, Lobby, Arena (all modes), Result modal at 375 px and iPad.
- **Test procedure:** Screenshots at listed widths + real device check (`MANUAL`).
- **Regression requirements:** Desktop 1366/1920.
- **Commit requirement:** `fix(B2): mobile layout`.
- **Status:** Partial. No browser is available to measure every screen, so only issues with evidence were fixed; acceptance ("no overflow on all screens at 375 px and iPad") is NOT TESTED — MANUAL.
  - Evidence used: existing `qa/evidence/G-06_375px.png` shows the header logo wrapping to 3 lines inside the 80 px header and the LEAVE button clipped at the right edge.
  - Files: `client/src/App.jsx` (header: logo text `hidden sm:inline` + `whitespace-nowrap`, `shrink-0` on logo / sound / LEAVE, username `truncate` on mobile, mobile gutters `px-gutter-mobile`, `py-margin-mobile` — existing theme tokens), `client/src/gameModes/MultiplayerGame.jsx`, `client/src/gameModes/TeamGame.jsx` (mobile order: canvas, then chat, then standings — HANDOFF B2 "canvas on top, chat below"; desktop `lg:` 3-column order unchanged).
  - Checks: render test 4/4 PASS (order classes, canvas column), client build PASS. Static scan found no fixed widths wider than 375 px on the live path (only `max-w-*`).
  - Not changed: Lobby, Home, Leaderboard, Solo AI screens (no evidence of overflow found by static scan).
  - **Added evidence (headless Chrome 154, real Tailwind config from `client/index.html`, components rendered in a 375 px iframe and at 820 px):** 9 screens — Login, Home (create/join), Room lobby, FFA drawer, FFA guesser ROUND_OVER, FFA word selection, Team, Solo AI, Leaderboard — no horizontal overflow at 375 px (9/9) and 820 px (9/9). Negative control on the pre-B2 commit `32d371d`: Home header overflows to 379 px at 375 px (8/9), so the check detects the issue. Not covered: result modal, real touch devices, Safari.

### P5.3 — PIN entry (B3)

- **Task ID:** P5.3
- **Requirement IDs:** B3 (BUG-14)
- **Goal:** A normal PIN entry needs no manual clicking between boxes.
- **Current problem:** Five independent inputs, no auto-advance, no `inputmode`, no paste handling (`client/src/App.jsx:457-497`).
- **Discovery requirements:** Whether `ROOM_PIN_LENGTH` is available on the client (depends on P1.2).
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Join protocol/payload.
- **Implementation requirements (deterministic):**
  - each box: `inputmode="numeric"`; accepts digits `0-9` only, other characters are ignored;
  - typing a valid digit fills the box and moves focus to the next box (last box keeps focus);
  - Backspace on a non-empty box clears it; Backspace on an empty box moves focus to the previous box and clears it;
  - pasting into any box: strip non-digits, fill boxes from the first box in order, ignore digits beyond the PIN length, focus the next empty box (or the last box);
  - box count comes from the shared `ROOM_PIN_LENGTH`, not a hardcoded 5.
- **Acceptance criteria:** Typing 5 digits continuously fills all boxes; pasting "83921" fills all boxes; Backspace behaves as above; on mobile the numeric keypad appears.
- **Test procedure:** Desktop keyboard + paste; real phone (`MANUAL`).
- **Regression requirements:** Join success/failure messages; RoomList join.
- **Commit requirement:** `fix(B3): pin auto-advance and paste`.
- **Status:** Done; on-device keypad / focus behaviour NOT TESTED (MANUAL).
  - File: `client/src/App.jsx`. Five separate `pin1..pin5` states replaced by one `pinDigits` array sized by `GAME_RULES.ROOM_PIN_LENGTH`; boxes rendered from it with `inputMode="numeric"`, `pattern="[0-9]*"`, `autoComplete="one-time-code"`, `aria-label`; label and length check use the shared constant.
  - Rules implemented as pure exported functions (`pinAfterInput`, `pinAfterBackspace`, `pinAfterPaste`) exactly as specified above, plus: typing into a filled box replaces its digit; a full-length autofill into any box fills from the first box.
  - Placeholder changed from the per-box digits of the seeded room code (`8 3 9 2 1`, a hardcoded copy of the server's seed room) to `•`.
  - Checks: logic test 12/12 PASS (continuous typing fills 5 boxes with focus 1→2→3→4; non-digit ignored; Backspace filled/empty/first box; paste full / noisy / partial; autofill); `inputMode:"numeric"` present in the production bundle; client build PASS; join flows unchanged on the server (e2e suites use `join_room` by code).
  - **Added evidence (headless Chrome, real `App` in a DOM, input/keydown/paste events):** 9/9 PASS — 5 boxes with `inputmode="numeric"`; typing 8,3,9,2,1 into whichever box has focus fills `83921` and ends focused on the last box; non-digit ignored; Backspace clears / moves back; paste of a noisy string fills `54321`; submit emits `join_room` with that code. On-screen keyboard behaviour on real phones remains MANUAL.

### P5.4 — LAN connection without localhost assumption (B5)

- **Task ID:** P5.4
- **Requirement IDs:** B5
- **Goal:** Other devices on the LAN connect without code edits.
- **Current problem:** `UNCERTAIN` — `services/socket.js` uses `localhost:4000` only when hostname is `localhost`, otherwise same origin via Vite proxy (ARCH §15). May already work.
- **Discovery requirements:** Verify on a second device with `npm run dev -- --host`; confirm interaction with P4.1 changes.
- **Allowed files:** TBD after read-only discovery (possibly none).
- **Forbidden changes:** Changes before P4.1 is merged and verified (shared connection code).
- **Implementation requirements:** Fix only if verification fails.
- **Acceptance criteria:** ≥ 2 other devices (phone, iPad) join a room and play over LAN.
- **Test procedure:** Real devices (`MANUAL`), photos of each device as HANDOFF requires.
- **Regression requirements:** Localhost dev; P4.1 reconnect.
- **Commit requirement:** `fix(B5): lan socket url` (or verification note only).
- **Status:** Verified, no code change (done after P4.1 as sequenced). Real phone / iPad over Wi-Fi NOT TESTED (MANUAL).
  - Finding: `client/src/services/socket.js` has no localhost assumption for other devices — it uses `http://localhost:4000` only when the page itself is on `localhost`, otherwise same origin, and Vite proxies `/socket.io` to the server.
  - Evidence (this machine, non-loopback address 192.168.2.1): default `npm run dev` (config `host: 127.0.0.1`) is NOT reachable on that address (HTTP 000); `vite --host` is (HTTP 200); a socket.io client connected to `http://192.168.2.1:5199` (same origin, through the proxy) created a room successfully.
  - Requirement for LAN play remains as documented in `HANDOFF.md`: run the client with `npm run dev -- --host`. Not changed in `vite.config.js` because exposing the dev server by default is a security/UX decision for the team.

---

## Phase 6 — Word bank + small fixes

### P6.1 — Default player name (C1)

- **Task ID:** P6.1
- **Requirement IDs:** C1 (BUG-10)
- **Goal:** No "กกก" default name.
- **Current problem:** `useState(localStorage.getItem('game_username') || 'กกก')` — `client/src/App.jsx:13`.
- **Discovery requirements:** Any other `กกก` occurrence on the live path.
- **Allowed files:** TBD after read-only discovery (candidate: `client/src/App.jsx`).
- **Forbidden changes:** Login flow redesign.
- **Implementation requirements:** Empty default (the input is already `required`).
- **Acceptance criteria:** Fresh browser (cleared storage) shows an empty name field; saved names still prefill.
- **Test procedure:** Clear `localStorage`, reload.
- **Regression requirements:** Login, empty-name rejection.
- **Commit requirement:** `fix(C1): remove default placeholder name`.
- **Status:** Done. `client/src/App.jsx` username initial state is `''` when nothing is saved (wrapped in try/catch for blocked storage); "กกก" no longer exists anywhere in `client/src`, `server/src`, `shared`. Checks: render test 3/3 PASS (fresh visit → empty nickname + login screen; saved name still used); build PASS.

### P6.2 — README run instructions (C2)

- **Task ID:** P6.2
- **Requirement IDs:** C2 (QA_REPORT BUG-05)
- **Goal:** README run instructions match the live project.
- **Current problem:** `README.md` documents the legacy game and `npm run migrate` / `create-admin`, which do not exist in `server/package.json` (ARCH §2.3, §17).
- **Discovery requirements:** Decide with the human whether to correct only the commands or rewrite the README to describe the live game (scope decision).
- **Allowed files:** TBD after read-only discovery (candidate: `README.md`).
- **Forbidden changes:** Adding scripts to `package.json` to match the old README; deleting legacy code.
- **Implementation requirements:** Documentation only.
- **Acceptance criteria:** Every command in README runs on a fresh clone.
- **Test procedure:** Follow the README on a clean checkout.
- **Regression requirements:** —
- **Commit requirement:** `docs(C2): fix run instructions`.
- **Status:** Done for the run instructions; whether to rewrite the rest of `README.md` (which documents the legacy "วาดต่อ" game) is still a human decision.
  - **Update (human request 2026-10-02, `docs: rewrite README for live game`):** `README.md` rewritten from the current implementation — game, modes, implemented features (and what is not there: no database, no accounts, legacy admin page unusable), install/run, regression tests (link to `tests/README.md`), live code map, developer notes, known limitations from this file, manual-test status exactly as recorded below (items 1–4 performed by the human, the rest NOT TESTED), DoodleNet / Quick, Draw! credits. The previous README (incl. the C2 run-section edit) moved unchanged to `docs/legacy-README.md` (git rename, 100 % similarity); its relative links (e.g. `HANDOFF.md`) now point one level too deep — left unchanged on purpose. Original baseline text is in git at `0d8fb96`.
  - `README.md` "เริ่มรัน" now lists only commands that exist for the live project (server `npm install` + `npm run dev` on port 4000; client `npm install` + `npm run dev`, with `-- --host` for LAN), drops the database / `.env` / `migrate` / `create-admin` / admin-page steps, and warns that the other README sections describe legacy code (link to `ARCHITECTURE.md`).
  - Checks: every `npm run` in the section's code blocks exists in the matching `package.json` (3/3); `npm run dev` for server and client were executed during this session (server listening on 4000, Vite ready on 5173).

### P6.3 — Port-in-use error (C3)

- **Task ID:** P6.3
- **Requirement IDs:** C3 (QA_REPORT BUG-06)
- **Goal:** Clear message when the port is already in use.
- **Current problem:** No `server.on('error')` in `server/src/server.js`.
- **Discovery requirements:** Confirm behaviour with port 4000 occupied.
- **Allowed files:** TBD after read-only discovery (candidate: `server/src/server.js`).
- **Forbidden changes:** Changing the default port.
- **Implementation requirements:** Readable error message and non-zero exit.
- **Acceptance criteria:** With the port occupied, server prints a clear message naming the port.
- **Test procedure:** Occupy port, start server.
- **Regression requirements:** Normal start.
- **Commit requirement:** `fix(C3): handle port in use`.
- **Status:** Done. `server/src/server.js` adds `server.on('error')`: on `EADDRINUSE` it prints `[JUST DRAW IT] Port <PORT> is already in use. Stop the other server or run with a different PORT (e.g. PORT=4001 npm run dev).` and exits with code 1; other errors are re-thrown. Default port unchanged.
  - Checks: with the port held by another process → message shown, exit code 1, 0 stack-trace lines; normal start → `/api/leaderboard` HTTP 200.

### P6.4 — Missing avatars (C4)

- **Task ID:** P6.4
- **Requirement IDs:** C4 (QA_REPORT BUG-07)
- **Goal:** All 8 `AVATARS` are selectable.
- **Current problem:** `AVATARS.slice(0, 6)` in `client/src/App.jsx` (login and lobby).
- **Discovery requirements:** Layout impact at 375 px.
- **Allowed files:** TBD after read-only discovery (candidate: `client/src/App.jsx`).
- **Forbidden changes:** Editing `AVATARS` in `shared/`.
- **Implementation requirements:** Render all avatars without overflow.
- **Acceptance criteria:** 👾 and 🚀 selectable on both screens; no overflow at 375 px.
- **Test procedure:** Visual check at desktop and 375 px.
- **Regression requirements:** P5.2.
- **Commit requirement:** `fix(C4): show all avatars`.
- **Status:** Done; visual check at 375 px NOT TESTED (MANUAL). `client/src/App.jsx`: both pickers (login and create-room) render all `AVATARS` (was `slice(0, 6)`), row changed to `flex-wrap justify-center` so 8 buttons wrap instead of overflowing at 375 px. `shared/` unchanged. Checks: render test 3/3 PASS (all 8 emoji incl. 👾 🚀 on both screens, wrapping row); build PASS.

### P6.5 — Word difficulty (D1)

- **Task ID:** P6.5
- **Requirement IDs:** D1 (BUG-09)
- **Goal:** Words grouped Easy/Medium/Hard, selectable in Host Settings; Solo AI uses only AI-supported words.
- **Current problem:** `difficulty` field exists but is unused; bank includes `Astronaut` (not an AI class); casing differs from `WORD_DIFFICULTY` (ARCH §9).
- **Discovery requirements:** Where the bank should live (HANDOFF suggests `shared/gameConfig.js`; current bank is `server/src/config/database.js`); an equivalent of `{text, difficulty, aiSupported}` — reuse existing structure if adequate; settings payload impact.
- **Allowed files:** TBD after read-only discovery. Likely touches `shared/` and settings payload → approval.
- **Forbidden changes:** Removing existing words without approval.
- **Implementation requirements:** Server selects words by room difficulty; Solo AI selects only AI-supported words.
- **Acceptance criteria:** Host picks a difficulty; word choices come only from it; Solo AI never offers an unsupported word.
- **Test procedure:** Multiple rounds per difficulty; Solo AI many rounds.
- **Regression requirements:** Word selection timeout auto-pick; P3.1.
- **Commit requirement:** `feat(D1): word difficulty`.
- **Status:** Done (approved by human 2026-10-02, implemented as proposed); MANUAL NOT TESTED.
  - **Contract change (approved):** `update_room_settings` accepts `wordDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | null` (null = Mixed; any other value ignored; host + LOBBY only, as for other settings); `room_data` carries `wordDifficulty`. Documented in `shared/contract.js`.
  - Files: `server/src/config/database.js` (bank uses `WORD_DIFFICULTY` values; `getRandomWords(count, { difficulty })`), `server/src/models/Word.js`, `server/src/gameLogic/RoomManager.js` (`wordDifficulty: null` default, in `sanitizeRoom`), `server/src/gameLogic/RoundManager.js` (word choices filtered), `server/src/socket/gameHandler.js` (validation), `shared/contract.js` (doc), `client/src/components/RoomLobby.jsx` (MIXED / EASY / MEDIUM / HARD buttons in Settings, host-only). No scoring change. Difficulty survives the return to LOBBY.
  - Checks: e2e 11/11 PASS (default Mixed; host sets EASY and all clients see it; guest change ignored; invalid value ignored; back to Mixed; EASY / MEDIUM / HARD games: all 18 offered words per game come from that list; setting kept after LOBBY); browser test 6/6 PASS (options shown, MIXED pressed for null, host click emits `{ wordDifficulty }`, MIXED emits null, guest sees choice with disabled buttons and sends nothing).
  - Follow-up `fix(D1): fallback for small difficulty pools`: if the chosen difficulty has fewer words than the 3 choices per turn, `getRandomWords` uses Mixed. Current bank: EASY 9, MEDIUM 6, HARD 5 → no level needs the fallback today. Checked by e2e (2-word HARD pool returns 3 words); e2e now 13/13.
  - Original proposal: `update_room_settings` accepts `wordDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | null` (values from `WORD_DIFFICULTY`, `null` = all); `room_data` gains `wordDifficulty`; server filters `Word.getRandomWords` by difficulty (bank values normalised to `WORD_DIFFICULTY`, currently lowercase). The Solo AI part ("only AI-supported words", e.g. drop `Astronaut`) overlaps A8 and stays blocked with it.

---

## Phase 7 — Remaining features

### P7.1 — Solo AI code path repair (A8)

- **Task ID:** P7.1
- **Requirement IDs:** A8 (BUG-03 — mapping NEEDS HUMAN CONFIRMATION)
- **Goal:** Solo AI uses the real DoodleNet model end-to-end with one consistent target word and the documented contract.
- **Current problem (ARCH §13):** `heuristicFallback()` uses `Math.random` and can return `isCorrect`; client sends `{pixels}` only; client and server target words differ; result fields differ from `contract.js`; client adds score locally; thresholds/words hardcoded; no `isValidPredictRequest` or rate limit.
- **Discovery requirements:** Decide the single owner of the target word (server); compare live payload with `contract.js` and choose the contract (any change → approval); behaviour while the model is loading.
- **Allowed files:** TBD after read-only discovery. Likely > 3 files → approval.
- **Forbidden changes:** Replacing DoodleNet; fake/random/heuristic guessing; Vision/other API.
- **Implementation requirements:** Remove/disable the random fallback (model not ready → report "not ready", never correct); validate requests; server-side rate limit; server owns target word and score; one shared word list/thresholds.
- **Acceptance criteria:** F12 shows the agreed request fields in `solo_ai_predict` and the agreed result fields; drawing Sun/House/Clock/Rainbow simply is recognized; drawing a different word scores nothing; no `Math.random` in the prediction path.
- **Test procedure:** Manual drawing per HANDOFF A8 + frame capture + code search for `Math.random` in `aiPredictor.js`.
- **Regression requirements:** Multiplayer modes unaffected; Solo AI excluded from leaderboard.
- **Commit requirement:** `fix(A8): solo ai real model path`.
- **Status:** Done (human 2026-10-02: BUG-03 does not block A8/A9; the BUG-03 mapping itself stays **NEEDS HUMAN CONFIRMATION**); MANUAL drawing test NOT TESTED.
  - **Contract change (pre-approved for A8/A9), documented in `shared/contract.js`:**
    - `solo_ai_predict` request — before: `{ pixels }` (client); after: `{ targetWord, pixels }` where `targetWord` is the server's `room_data.currentWord` echoed back (validated with `isValidPredictRequest`; must equal `room.currentWord`, otherwise ignored).
    - `solo_ai_prediction_result` — before: `{ guess, confidence, rawConfidence, globalGuess, globalConfidence, isCorrect, topGuesses }`; after: `{ targetWord, ready, guess, confidence, isConfident, top3, modelSees, isCorrect }` (the contract shape plus `ready` and `isConfident`; `guess` may be `null`).
  - Server: `aiPredictor.js` — `heuristicFallback()` / `Math.random` removed; model not loaded or prediction error → `ready: false, isCorrect: false, guess: null`; thresholds, image size, model dir and game words from `SOLO_AI`. `gameHandler.js` — request validated, only from the solo drawer during PLAYING, stale target ignored, rate-limited to `SOLO_AI.SERVER_MIN_INTERVAL_MS` per socket, result dropped if the turn changed while predicting, score `SOLO_AI.CORRECT_SCORE`. `RoundManager.js` — Solo turns use only AI-supported words (`SOLO_AI.GAME_WORDS`, with the room difficulty) and the server starts PLAYING immediately with its own word (no client word selection). `database.js` — `aiOnly` filter (so `Astronaut` is never a Solo target).
  - Client: `SoloAIGame.jsx` — target, round and score come from `room_data`; no local word list, random pick, local score or Skip; requests `{ targetWord, pixels }` every `SOLO_AI.PREDICT_INTERVAL_MS` only while PLAYING; results for another word are ignored.
  - **Removed feature (flag for review):** the **Skip Word** button. It picked a new word on the client (`Math.random` over a local list), which contradicts "the client must not choose the target word". A server-side skip would need a new socket event (not in the approved scope). Turns still advance on timeout or a correct guess.
  - Checks: e2e 20/20 PASS with the real DoodleNet model — no `Math.random`/`heuristicFallback` in the source; model not ready → 20 identical `ready:false` results; empty canvas → no guess; result keys match the contract; synthetic Sun doodle → correct for Sun and not for Clock; synthetic Clock → correct; House doodle → `isConfident:false`, not correct; 12 deterministic scribbles never correct while not confident; Solo starts PLAYING without word selection with an AI-supported HARD word; wrong target / bad pixels / missing target ignored; 2 requests within 500 ms → 1 result; result echoes the server target; correct doodle ends the turn with +500 (this check runs only if a turn's target is Sun or Clock within 10 EASY turns — otherwise the test prints INFO and does not count it); `solo_ai_predict` ignored in multiplayer rooms. Browser test 10/10 PASS — server word shown, round/score from `room_data`, no Skip, `{ targetWord, pixels }` sent with 784 pixels, "AI model is loading…", stale result ignored, correct flash `+500`, panel resets on the next word.
  - MANUAL still required (HANDOFF A8): draw Sun / House / Clock / Rainbow by hand in the real UI.

### P7.2 — Low-confidence display (A9)

- **Task ID:** P7.2
- **Requirement IDs:** A9 (BUG-03 — mapping NEEDS HUMAN CONFIRMATION)
- **Goal:** UI shows "Not sure yet..." when raw probability < `MIN_RAW_PROB`.
- **Current problem:** UI always shows the top game word (ARCH §13).
- **Discovery requirements:** Which result field carries raw probability after P7.1.
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Thresholds hardcoded in a second place.
- **Implementation requirements:** Use the shared threshold.
- **Acceptance criteria:** Random scribbles never display a word name nor score.
- **Test procedure:** Manual scribble test + frame capture.
- **Regression requirements:** P7.1 acceptance.
- **Commit requirement:** `fix(A9): low confidence display`.
- **Status:** Done (automated); MANUAL NOT TESTED. Server sets `isConfident = rawProb ≥ SOLO_AI.MIN_RAW_PROB` and never marks a non-confident result correct; the client shows "Not sure yet…" and hides word names (guess, top predictions, model label) when `isConfident` is false. Checks: e2e House doodle + 12 scribbles; browser test "Not sure yet…" with no word names.

### P7.3 — Partial eraser (D2)

- **Task ID:** P7.3
- **Requirement IDs:** D2
- **Goal:** Real eraser that removes stroke pixels (not white paint), synchronized to all clients.
- **Current problem:** Eraser paints `#ffffff` (ARCH §12); QA E-01…E-06 are N/A.
- **Discovery requirements:** Canvas layering, fill behaviour, `drawingHistory` replay, Solo AI pixel capture (reads the first `<canvas>`).
- **Allowed files:** TBD after read-only discovery.
- **Forbidden changes:** Full canvas redesign; payload changes without approval.
- **Implementation requirements:** Erase only strokes (e.g. separate stroke layer with `destination-out` per HANDOFF D2); sync via socket; replay via `draw_sync`.
- **Acceptance criteria:** QA E-01…E-06 pass with new runtime evidence.
- **Test procedure:** QA E cases, 2 clients.
- **Regression requirements:** Drawing, fill, clear, challenges, Solo AI prediction.
- **Commit requirement:** `feat(D2): partial eraser`.
- **Status:** Done; tested in headless Chrome (no new dependency); real devices MANUAL.
  - File: `client/src/components/Canvas.jsx`. No server or contract change: eraser strokes already travel in `draw_begin`/`draw_path` with the existing `tool: 'eraser'` field and are stored in `drawingHistory`.
  - Layers: stroke canvas (transparent, still the first `<canvas>` in the DOM so Solo AI `canvasToPixels` keeps reading it), background canvas underneath (`-z-10`, bucket fill), ghost canvas on top. Eraser uses `globalCompositeOperation = 'destination-out'` on the stroke layer only (local and remote, incl. `draw_sync` replay); every other tool/shape resets to `source-over`. Clear empties both layers.
  - Behaviour change to note: the bucket now colours the background behind existing strokes (HANDOFF D2 layer design) instead of painting over them. For Solo AI the bucket colour is no longer counted as ink (transparent stroke layer) — A8/A9 remain blocked; flagging for the human reviewer.
  - Checks (headless Chrome 154, real component, stubbed socket, real PointerEvents): 16/16 PASS — eraser removes stroke pixels (alpha 0) and keeps the rest of the line, background colour survives under the erased spot, `tool:"eraser"` emitted, pen works again after the eraser, a guesser canvas replaying the emitted history matches (erased spot empty, kept parts present), clear empties both layers, first `<canvas>` is the stroke layer; also B1: computed `touch-action: none`, canvas shown at 320 px, stroke lands at canvas (320,240), emitted coordinates in 640×480 space. Negative control against the previous `Canvas.jsx`: 9/16 (white-paint eraser, alpha 255). E-03 (size slider) / E-05 (challenge interplay) not separately automated.

### P7.4 — Challenge popup (D3)

- **Task ID:** P7.4
- **Requirement IDs:** D3 (BUG-05)
- **Goal:** Players are told the round's challenge and its rule before drawing begins.
- **Current problem:** Inline banner only; DONT_LIFT_PEN uses a blocking `alert()` on violation (ARCH §10).
- **Discovery requirements:** **STOP for team decision first** — HANDOFF D3 says the team must agree between adding a popup or replacing the board-covering element with a small bar. Confirm when `currentChallenge` is available to clients (currently in `room_data` from `WORD_SELECTION`).
- **Allowed files:** TBD after read-only discovery and team decision.
- **Forbidden changes:** Revealing any secret (word, candidates) in the popup; unrelated UI changes.
- **Implementation requirements (deterministic, pending the team decision above):**
  - when a turn's challenge is not `NONE`, every client shows a popup during `WORD_SELECTION` (before `PLAYING`), containing the challenge name and description from shared `CHALLENGE_DETAILS`;
  - for `DONT_LIFT_PEN` the popup states explicitly that the pen must not be lifted while drawing;
  - the popup closes when the player dismisses it or when the state becomes `PLAYING`; the existing inline banner remains during `PLAYING`;
  - no popup when the challenge is `NONE`;
  - the DONT_LIFT_PEN violation notice must not use a blocking `alert()`.
- **Acceptance criteria:** Each challenge type shows the correct popup once per turn before drawing; no popup for `NONE`; no secrets in popup content or payload.
- **Test procedure:** Force each challenge via host settings (enable one at a time); screenshots on drawer and guesser.
- **Regression requirements:** Challenge enforcement (C-01…C-08, re-verified), P5.2 layout.
- **Commit requirement:** `feat(D3): challenge popup`.
- **Status:** Done (human decision 2026-10-02: implement the documented BUG-05 popup); MANUAL NOT TESTED. No server or contract change (`currentChallenge` / `forcedColor` already in `room_data`).
  - Files: `client/src/components/ChallengeOverlay.jsx` (new exports `ChallengeModal` — same look as the existing MATCH RESULTS modal — and `ChallengeTurnPopup`), `client/src/components/Canvas.jsx` (DONT_LIFT_PEN violation uses `ChallengeModal` instead of `alert()`), `MultiplayerGame.jsx`, `TeamGame.jsx`, `SoloAIGame.jsx` (render `ChallengeTurnPopup`). The inline banner stays.
  - ~~First version (`5a69b93`): closed on GOT IT or when the turn ended.~~ **Follow-up `fix(D3): auto-close challenge popup` (human request 2026-10-02):** shown to every player once per turn (key = room + round + drawer); closes on GOT IT **or** automatically after `UI.CHALLENGE_POPUP_MS` (3000 ms, new `UI` constant in `shared/contract.js`, client-only UX timing) counted from the start of the turn — it no longer stays open until the turn ends. For the drawer it also closes the moment PLAYING starts if they already saw it in WORD_SELECTION, so it never uses drawing time. Limitation: Solo AI turns start directly in PLAYING, so the solo player sees it for at most 3 s of the turn (or less with GOT IT). The DONT_LIFT_PEN violation modal closes on OK or after the same delay; the board stays locked by the rule (banner), never by a modal.
  - Follow-up checks: browser test rewritten, 19/19 PASS (delay from contract; GOT IT closes immediately; still open shortly after WORD_SELECTION→PLAYING for a guesser and closed ~3 s after the turn start; drawer sees it in WORD_SELECTION and it closes when PLAYING starts; turn starting in PLAYING shows it and it closes by itself; none for NONE / outside a turn; no candidate words; violation modal: shown, no alert, OK closes, auto-closes, banner remains). Full suite 32/32, client build PASS.
  - Remaining `alert()` calls in the live client are join / PIN error messages (`App.jsx`, `RoomList.jsx`), not challenge notifications — unchanged.
  - Checks: headless Chrome 13/13 PASS — popup at turn start for a guesser; DONT_LIFT_PEN text says the pen must not be lifted; GOT IT closes it and it stays closed when PLAYING starts; none after the turn; shown again next turn; auto-closes at turn end if not dismissed; none for NONE; drawer sees it before drawing with the COLOUR_FIX locked colour; no candidate words in the popup; lifting then drawing shows the DON'T LIFT PEN modal, `window.alert` never called, OK closes it and the board stays locked. Render / browser / build regression PASS.

---

## Unassigned findings (need human decision before becoming tasks)

Found during discovery; not part of A–D. Do not fix as side effects.

| ID | Finding | Evidence | Possible home |
|---|---|---|---|
| U1 | Identity is username-based; same-name join takes over a player/host slot | ARCH §3.3 | P4.1 discovery |
| U2 | `select_word` accepts any word, not only `wordOptions` | `gameHandler.js:135` | P3.1 or new task |
| U3 | `start_game` has no `status` guard (restart mid-game) — **resolved in P2.1** | `gameHandler.js:116-127` | P2.1 |
| U4 | No payload validation / rate limit in live handlers | ARCH §3.2 | new security task |
| U5 | DONT_LIFT_PEN / GEOMETRIC_ONLY enforced only on client | ARCH §3.2, §10 | new task |
| U6 | `qa/package.json` test script points to missing `test_runner.js`; QA scripts contain hardcoded PASS | ARCH §16 | QA cleanup task |
| U7 | Dead/legacy code tree (ARCH §2.3) | ARCH §2.3 | cleanup task, only with explicit approval |
| U10 | `create_room` accepts any `roundTime`/`totalRounds`/`maxPlayers` without the 15–180 / 1–10 / 2–16 clamps used by `update_room_settings` | `RoomManager.createRoom`, `gameHandler.js` create_room | validation task |
| U9 | No client UI for the existing `switch_team` event; a team emptied by a leave in LOBBY blocks START until someone joins | `client/src` (no `SWITCH_TEAM` usage) | new UI task |
| U8 | Header logo click clears `currentRoomId` without emitting `leave_room` → player stays in the room server-side | `client/src/App.jsx` header logo `onClick` | P2.3 or new task |
