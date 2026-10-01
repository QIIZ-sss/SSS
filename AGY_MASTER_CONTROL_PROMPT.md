# JUST DRAW IT — AGY MASTER CONTROL PROMPT

You are working on the existing **JUST DRAW IT** project.

Your first assignment is to establish safe project-control documentation before any application-code changes.

## ABSOLUTE RULE

**DO NOT MODIFY APPLICATION SOURCE CODE IN THIS assignment.**

Do not modify, delete, rename, move, refactor, or rewrite application files.

Do not touch application source under:
- `client/`
- `server/`
- `shared/`

Do not modify package files, configuration, or existing QA implementation.

Your job in this assignment is:

1. inspect the repository read-only;
2. inspect the project documentation and QA evidence;
3. report a discovery summary;
4. STOP and wait for explicit human approval;
5. only after approval, create/update:
   - `AGENTS.md`
   - `ARCHITECTURE.md`
   - `TASKS.md`

Do not skip the approval gate.

---

# 1. READ-ONLY DISCOVERY GATE

Before creating or modifying the three Markdown control files, inspect the actual repository.

Read, when present:

1. `HANDOFF.md`
2. `README.md`
3. `README_AI.md`
4. `QA_AGENT_TASK.md`
5. `qa/QA_REPORT.md`
6. relevant files under `shared/`
7. relevant files under `server/`
8. relevant files under `client/`
9. package.json files
10. current socket/event implementation
11. current game-state implementation
12. current room/game management
13. current Solo AI implementation
14. current word-bank implementation
15. current challenge implementation
16. current session/reconnect implementation

Also inspect the actual repository tree.

### IMPORTANT

Do NOT assume that a filename mentioned in documentation exists.

Do NOT invent filenames.

Do NOT invent functions.

Do NOT invent socket events.

Do NOT invent payload fields.

Do NOT invent test results.

Do NOT assume the target architecture is already implemented.

Clearly distinguish:

- `CURRENT FACT` — verified from the repository
- `DOCUMENTATION CLAIM` — stated by project documentation
- `UNCERTAIN / NEEDS VERIFICATION` — not yet proven

### Evidence hierarchy

When sources disagree, do not silently reconcile them.

Use this order when determining what is actually implemented:

1. **Current repository implementation** — source code/config that can be inspected directly.
2. **Actual test/runtime evidence** — logs, network traces, reproducible behavior, or test output from the current repository.
3. **Current project documentation** — `HANDOFF.md`, `README.md`, QA reports, and other project docs.
4. **Historical/team notes** — useful context, but not proof of current implementation.

A lower-level source must not override a higher-level verified fact.

If runtime evidence contradicts code reading, treat the code reading as possibly wrong and report both as a CONFLICT.

If a documentation claim conflicts with current code, report both:

```text
CURRENT FACT:
DOCUMENTATION CLAIM:
CONFLICT:
```

Do not “fix” the documentation claim during discovery unless that document itself is one of the explicitly approved documentation outputs.

## Requirement/bug mapping verification

During discovery, create a compact mapping table from the **exact original 14-bug team report below** to the current requirement IDs.

### Original 14 bugs (source: team bug report)

```text
BUG-01 Leave Lobby at game end shows Round 4/3 instead of returning to lobby
BUG-02 Game starts without all players pressing Ready
BUG-03 Solo vs AI mode
BUG-04 Team mode can be played with only one player
BUG-05 Challenge and "Don't Lift Pen" notification should be a popup
BUG-06 Phone / iPad screen sizes
BUG-07 Answer visible to guessers via F12
BUG-08 Drawer should not be able to type in chat
BUG-09 Word categories by difficulty: Easy / Medium / Hard
BUG-10 Default player name shows as "กกก"
BUG-11 When time runs out with no correct guess, the answer should be revealed
BUG-12 Page scrolls while drawing on iPad / phone
BUG-13 Refreshing inside a room kicks the player back to Home
BUG-14 PIN input requires clicking each box separately
```

Use:

| Previous bug | Requirement ID | Current implementation status | Evidence/source |
|---|---|---|---|
| BUG-01 … | A… | … | … |

Rules:

- Map only when the repository/documentation provides evidence for the mapping.
- Do not invent mappings.
- If a bug has no supported A–D mapping, mark it explicitly:
  `UNMAPPED — requires human decision`
- If documentation and implementation disagree, preserve both facts and mark the discrepancy.
- The original bug list above is the authoritative input for this 14-bug coverage check; do not substitute a guessed list from memory.
- This mapping is a coverage check only; it must not cause unrelated source changes.
- Do NOT assume a mapping such as `BUG-10 → C1` unless the repository/documentation actually supports it.

## Discovery output

Produce a concise report containing:

```text
Current repository structure:
Current game-state implementation:
Current socket/event implementation:
Current server/client responsibilities:
Current source-of-truth files:
Current word-bank implementation:
Current challenge implementation:
Current Solo AI implementation:
Current session/reconnect implementation:
Current QA/test structure:
Known requirements and bugs:
Architecture risks:
Potential files relevant to future tasks:
Contradictions between documentation and implementation:
State machine / round-counter findings:
Current `currentWord` visibility by role and game state:
Correct-guess chat behavior:
WORD_SELECTION candidate-word visibility:
Reconnect/session visibility behavior:
14-bug mapping:
```

### Discovery side-effect rule

During this discovery gate, do not:
- run commands that modify project state;
- install packages;
- update lockfiles;
- generate build artifacts;
- create QA evidence;
- run formatters that rewrite files;
- auto-fix lint/test failures;
- commit anything.

Read-only inspection and non-mutating test/runtime observation are allowed only when they do not alter tracked project files or dependencies.

### STOP

After producing the discovery summary:

**STOP.**

Do NOT create or modify `AGENTS.md`, `ARCHITECTURE.md`, or `TASKS.md` yet.

Wait for explicit human approval.

Do not convert uncertain observations into architectural facts.

---

# 2. PROJECT PRINCIPLE

The project already contains working functionality.

The governing rule is:

> **FIX THE TASK, NOT THE WHOLE PROJECT.**

The target architecture is a gradual direction, not permission to rewrite the project.

Never:
- rewrite the application unnecessarily;
- migrate JS/JSX to TypeScript merely for architecture;
- move all existing files;
- rename working APIs without need;
- replace working systems without a requirement;
- rebuild Socket.io;
- replace DoodleNet;
- introduce a framework unnecessarily;
- create abstractions that are not required by a task;
- refactor unrelated code.

Every change must have a direct relationship to:
- a requirement;
- a confirmed bug;
- a security issue;
- a feature;
- or a required test.

---

# 3. AGENTS.md REQUIREMENTS

After human approval of the discovery summary, create/update `AGENTS.md`.

`AGENTS.md` is a compact operational rulebook.

### SIZE LIMIT

Target maximum: approximately **2 pages**.

Do not put detailed phase descriptions, long test cases, architecture explanations, or long examples in `AGENTS.md`.

Those belong in:
- `ARCHITECTURE.md`
- `TASKS.md`

Do not duplicate the same rule in multiple sections.

`AGENTS.md` should contain only rules that apply to almost every development task:

## 3.1 Minimal-change rule

Prefer the smallest safe change that satisfies the requirement.

### Approval-required architecture changes

The following ALL require the explanation below **and a STOP for explicit human approval before implementation**:

1. modifies anything under `shared/`;
2. changes a Socket.io event name;
3. changes a Socket.io payload structure;
4. renames or moves existing files;
5. creates a new folder;
6. modifies more than 3 application source files;
7. introduces a new architectural layer;
8. replaces an existing implementation.

Use:

```text
Problem:
Root cause:
Why a smaller fix is insufficient:
Files affected:
Impact:
```

Do not write the justification and continue automatically.

For ordinary small fixes, only summarize:

```text
Changed:
Reason:
Files:
```

## 3.2 No-hardcoding rule

Before adding a constant:

1. search the repository;
2. find the existing source of truth;
3. reuse it if possible;
4. create a new constant only when a real missing concept exists.

Client and server may both use the same shared values for UX and validation, but the client must not define a competing value.

For example, the client may read the shared minimum-player value to disable the START button, while the server independently enforces that same shared rule and remains authoritative.

Never duplicate or redefine gameplay values separately.

Server is authoritative for gameplay and security.

## 3.3 Socket contract rule

Do not casually rename or change:
- socket event names;
- payload field names;
- payload meaning;
- event direction.

Search all usages before changing a socket contract.

Changing a socket contract requires explicit approval.

## 3.4 Security rule

Never trust the client for:
- game state;
- player role;
- drawer identity;
- score;
- correct answer;
- readiness;
- host permission;
- game start permission;
- round transitions;
- challenge enforcement.

Client restrictions are UX, not security.

## 3.5 Task workflow

For every implementation task, follow this compact workflow:

1. **Discover** — inspect the actual implementation and relevant tests.
2. **Confirm scope** — identify the requirement, allowed files, and acceptance criteria.
3. **Approval gate** — if an approval-required change is triggered, explain it and STOP.
4. **Implement** — make the smallest change that satisfies the task.
5. **Test** — execute the relevant tests; never invent results.
6. **Inspect diff** — run `git status` and `git diff`; remove unrelated changes.
7. **Commit** — make one focused commit for the task after verification.

Do not skip discovery or report a task complete before testing.

## 3.6 AI rule

Solo AI uses the existing DoodleNet implementation.

Do not replace it with:
- fake AI;
- random guessing;
- heuristic-only guessing;
- another API model;
- Vision API;
- fake confidence;
- hardcoded predictions.

Do not change the AI architecture unless a future task explicitly authorizes it.

## 3.7 Evidence rule

Never report PASS/FIXED/VERIFIED unless actually tested.

If a test cannot be performed, mark it:
- `MANUAL`
- or `NOT TESTED`

Never fabricate screenshots, logs, measurements, or test results.

## 3.8 Scope rule

Modify only files approved for the task.

If another file becomes necessary, STOP and request approval.

## 3.9 STOP CONDITIONS

STOP and request human approval before implementation if any approval-required architecture change from 3.1 is triggered, including:
- changing Socket.io payloads/events;
- changing `shared/`;
- renaming or moving files;
- creating a new folder;
- modifying more than 3 application source files;
- introducing an architectural layer;
- replacing an existing implementation.

Also STOP for:
- replacing DoodleNet;
- deleting existing functionality;
- changing unrelated UI;
- ambiguous acceptance criteria;
- implementation/specification contradictions.

Never use destructive Git commands such as:

```text
git reset --hard
git checkout -- ...
```

to discard work unless the human explicitly requests it.

---

# 4. ARCHITECTURE.md REQUIREMENTS

After approval, create/update `ARCHITECTURE.md`.

This document must clearly separate:

## CURRENT ARCHITECTURE

Only describe what is verified in the current repository.

Document:
- client structure;
- server structure;
- shared code;
- game state handling;
- room management;
- socket handling;
- word management;
- challenges;
- scoring;
- Solo AI;
- session/reconnect;
- tests/QA.

Do not present planned architecture as current.

## TARGET ARCHITECTURE

Use this as the long-term direction:

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

This is a TARGET ARCHITECTURE.

Do not move files just to make the tree look like this.

Migration must be gradual and requirement-driven.

---

# 5. ARCHITECTURE RESPONSIBILITIES

Document these intended boundaries:

### shared
Shared contracts and values used by both client and server.

### server/game
Game state machine, rounds, turns, transitions.

### server/validation
Rules that determine whether an action is legal.

### server/room
Room lifecycle, join/leave, PIN handling.

### server/session
Reconnect and player identity persistence.

### server/words
Word bank and difficulty.

### server/challenge
Mini-challenge behavior.

### server/score
Score calculation.

### server/ai
AI model/predictor integration.

AI must not secretly own the entire game loop.

### server/socket
Thin transport handlers.

Socket handlers should delegate business logic to game/room/validation code.

### client/pages
Screens and user flow.

### client/canvas
Pointer/touch/drawing behavior.

### client/components
Reusable UI components.

---

# 6. GAME STATE MODEL

Document the intended lifecycle, but clearly label it as TARGET unless verified in the current code.

```text
LOBBY
  ↓
WORD_SELECTION
  ↓
PLAYING
  ↓
ROUND_OVER
  ↓
WORD_SELECTION
  ↓
PLAYING
  ↓
...
  ↓
GAME_OVER
  ↓
LOBBY
```

Two different transitions must remain separate:

## End-of-game

```text
ROUND_OVER
    ↓
GAME_OVER
    ↓
LOBBY
```

## Between rounds

```text
ROUND_OVER
    ↓
WORD_SELECTION
    ↓
PLAYING
```

`GAME_OVER` must prevent another round from being created after the final round.

---

# 7. PLAYER DATA VISIBILITY

The architecture must explicitly distinguish player views.

At minimum:

```text
Drawer:
- may know currentWord

Guesser:
- must NOT receive currentWord during WORD_SELECTION
- must NOT receive currentWord during PLAYING
- may receive wordLength
- may receive currentWord during ROUND_OVER
```

This is a network/security requirement.

Do not rely on hiding the answer in the UI.

The server must avoid sending secret data to unauthorized clients.

---

# 8. TASKS.md REQUIREMENTS

After approval, create/update `TASKS.md`.

Every task must contain:

```text
Task ID
Requirement IDs
Goal
Current problem
Discovery requirements
Allowed files
Forbidden changes
Implementation requirements
Acceptance criteria
Test procedure
Regression requirements
Commit requirement
```

## IMPORTANT: FILES ALLOWED

Do not invent exact file paths.

If a task has not yet completed discovery, write:

```text
Files allowed:
TBD after read-only discovery
```

After discovery of that specific task, replace TBD with actual verified files.

---

# 9. REQUIREMENT COVERAGE

Every requirement must appear somewhere in `TASKS.md`.

The complete requirement set is:

```text
A1–A9
B1–B5
C1–C4
D1–D3
```

No requirement may disappear silently.

If intentionally postponed:

```text
Status: Deferred
Reason:
Planned phase:
```

If intentionally removed:

```text
Status: Removed
Reason:
```

---

# 10. PHASE ROADMAP

## PHASE 1 — Shared Contract + Game End

### P1.1
Focused discovery of the current **state machine, round counter, round-transition logic, and end-of-game boundary**.

Do not repeat a full-repository discovery already completed by this documentation task unless new evidence requires it.

### P1.2
Align shared state/event/type definitions only where required.

Do not create files merely to match the target tree.

### P1.3 — A2

Fix end-of-game transition:

```text
ROUND_OVER
→ GAME_OVER
→ LOBBY
```

Must prevent Round 4/3 when `totalRounds = 3`.

### P1.4 — A2 Regression

Verify:

- no Round 4/3;
- final round ends correctly;
- timer stops after GAME_OVER;
- room returns to LOBBY;
- round state resets when returning to LOBBY;
- ready state resets when returning to LOBBY;
- scores remain available during GAME_OVER for Podium/Result;
- scores are cleared ONLY when returning to LOBBY / initializing a new game;
- a new game requires players to Ready again;
- a new game begins at Round 1.

---

# 11. PHASE 2 — SERVER GAME CORE

## P2.1 — A4

Ready validation.

Server must reject START when required players are not ready.

Client-side disabling is UX only.

## P2.2 — A5

Minimum-player validation.

Server must reject invalid FFA/Team starts.

## P2.3

Between-round transition:

```text
ROUND_OVER
→ WORD_SELECTION
→ PLAYING
```

Must:
- select the correct next drawer;
- reset round timer;
- reset round-specific state;
- select the next word;
- enforce totalRounds;
- avoid entering GAME_OVER early.

## P2.4 — A3

Timeout reveal.

If nobody guesses before timeout:

```text
PLAYING
→ ROUND_OVER
```

and the answer becomes visible to all players.

## P2.5 — A7

Timer verification/fix.

Verify:
- timer counts down during PLAYING;
- timer reaches 0 when the round ends;
- timer resets when a new round starts;
- timer remains synchronized within the project's accepted tolerance;
- timer continues across at least 3 consecutive rounds without refresh.

A screenshot showing identical values is NOT sufficient evidence that the timer is running.

Evidence must show actual decreasing values over time.

---

# 12. PHASE 3 — SECURITY

## P3.1 — A1

Answer leakage.

Rules:

```text
WORD_SELECTION → guesser cannot receive currentWord
PLAYING        → guesser cannot receive currentWord
ROUND_OVER     → currentWord may be revealed
GAME_OVER      → reveal according to the actual Result UI
```

Also prevent answer leakage through indirect channels:

- When a player guesses correctly, do NOT broadcast the guessed answer as normal chat text to other players.
- Other players should receive only a neutral result such as `X guessed correctly` (using the project's existing event/payload contract where possible).
- During `WORD_SELECTION`, the list of candidate words must be sent only to the drawer who is choosing.
- Guessers and other non-drawers must not receive the candidate-word list through socket payloads, room state, logs intended for clients, or other client-visible data.

Verify direct and indirect leakage using WebSocket/network inspection.

## P3.2 — A6

Drawer chat restriction.

Both client UX and server validation must enforce the rule.

---

# 13. PHASE 4 — SESSION / RECONNECT

## P4.1 — B4

Refresh/reconnect.

First inspect the existing implementation.

Goal:

Refreshing during a game should reconnect the player to the existing session according to the project's reconnect grace rules.

Security acceptance criteria:
- Reconnected clients receive only the state/data allowed for their role.
- A guesser must not receive `currentWord` during `WORD_SELECTION` or `PLAYING`.
- A guesser must not obtain the answer by requesting a generic/full room snapshot after refresh.
- Reconnect state must use the same server-side visibility rules as normal state broadcasts.
- The drawer may receive drawer-only data; non-drawers must not receive drawer-only data.

Do not invent a new session system if the existing system can be safely extended.

---

# 14. PHASE 5 — MOBILE

These tasks may run in parallel with server work ONLY when they do not touch the same files or contracts.

Requirements:

```text
B1
B2
B3
B5
```

B1:
- Pointer Events;
- touch drawing;
- prevent page scrolling while drawing.

B2:
- mobile/iPad responsive layout;
- no overflow.

B3:
- `inputmode="numeric"`;
- automatically advance to the next PIN box after a valid digit;
- Backspace moves back to the previous box when appropriate;
- pasting a full PIN fills the PIN boxes correctly;
- no requirement to click each box manually for a normal PIN entry flow.

B5:
- no hardcoded localhost assumption when another device connects over LAN.

## B5 sequencing constraint

B5 and B4 must NOT be implemented in parallel if repository discovery shows they touch the same client socket-connection/reconnect code.

Implement **B4 first**, verify reconnect/session behavior, then implement **B5** and verify LAN/hostname connection behavior.

If discovery proves the tasks use completely separate files with no shared connection logic, they may be parallelized on separate branches.

## Parallel branch rule

Every parallel task/session MUST use its own branch.

Examples:

```text
mobile/B1
mobile/B2
mobile/B3
network/B5
security/A1
game/A7
```

Do not let multiple agents commit unrelated work directly to the same branch.

Before merge:

1. inspect `git diff`;
2. resolve conflicts deliberately;
3. run relevant tests;
4. verify no unrelated files changed;
5. obtain human approval.

---

# 15. PHASE 6 — WORD BANK + SMALL FIXES

Requirements:

```text
C1
C2
C3
C4
D1
```

Also design the word-bank representation so Solo AI can distinguish words supported by DoodleNet.

Conceptually:

```text
word
├── text
├── difficulty
└── aiSupported
```

But do not impose this exact structure if the current project already has an appropriate equivalent.

Inspect first.

Solo AI must select only words supported by the AI in Solo mode.

---

# 16. PHASE 7 — REMAINING FEATURES

Requirements:

```text
A8
A9
D2
D3
```

## A8/A9 — Solo AI

Keep the real DoodleNet implementation.

Verify:
- client sends the required prediction request;
- server receives the correct target word/pixels according to the existing contract;
- predictor uses the real model;
- result fields match the actual contract;
- no fake/random/heuristic replacement;
- low-confidence predictions do not falsely claim a correct word.

## D2 — Partial Eraser

Inspect current canvas architecture first.

A real eraser must not merely paint white over existing strokes.

The implementation must preserve synchronized drawing behavior and satisfy the relevant QA cases.

Do not redesign the entire canvas without need.

## D3 — Challenge Popup

Implement the required challenge notification behavior:

- At the start of a round, display the challenge and its rule as a popup/notification.
- For the “Don't Lift Pen” challenge, clearly notify the player that the pen must not be lifted during the challenge.
- The popup must communicate the challenge before drawing begins and must not reveal unrelated game secrets.
- Follow the existing challenge/game flow rather than redesigning unrelated UI.

---

# 17. QA INTEGRATION

Use the existing QA plan and report as evidence.

Do not assume an old PASS remains valid after code changes.

After each task:

1. run task-specific tests;
2. run relevant regression tests;
3. inspect `git diff`;
4. record actual results.

After each major phase:

- run the relevant QA subset.

Before final demo:

- run the complete regression suite.

Manual-only tests must remain explicitly marked `MANUAL`.

---

# 18. GIT RULE

Each implementation task gets a separate commit.

Examples:

```text
fix(P1.3): fix game over transition
fix(P2.1): enforce ready validation
fix(P2.5): fix timer synchronization
fix(P3.1): prevent answer leakage
feat(B4): restore reconnect session
```

Before committing:

```bash
git status
git diff
```

Check for:
- unrelated files;
- generated files;
- debug code;
- hardcoded values;
- accidental socket-contract changes;
- deleted files.

Never use destructive Git commands to discard work without explicit human approval.

---

# 19. FINAL QUALITY CHECK

Before considering the documentation complete, verify:

## AGENTS.md
- ≤ approximately 2 pages;
- contains only global operational rules;
- STOP conditions appear only once;
- no duplicated long explanations.

## ARCHITECTURE.md
- CURRENT and TARGET are clearly separated;
- current facts are based on repository inspection;
- state transitions are documented;
- player data visibility is documented;
- server/client responsibilities are documented;
- AI boundaries are documented.

## TASKS.md
- A1–A9 all mapped;
- B1–B5 all mapped;
- C1–C4 all mapped;
- D1–D3 all mapped;
- all 14 previously documented bugs mapped to A–D or explicitly marked UNMAPPED;
- Phase 1–7 defined;
- P1.1 is focused on state/round-counter discovery rather than repeating full-repo discovery;
- P1.3 and P2.3 clearly separated;
- A7 explicitly mapped to P2.5;
- P1.4 distinguishes GAME_OVER score preservation from new-game score reset;
- P3.1 covers direct and indirect answer leakage, including correct-guess chat and word-selection candidates;
- P4.1 preserves role-based data visibility during reconnect;
- B4/B5 sequencing is explicit;
- B3 PIN behavior is deterministic;
- D3 challenge-popup behavior is deterministic;
- documentation commit is planned separately and pending human review;
- discovery-first workflow is explicit;
- exact filenames are not invented.

---

# 20. DOCUMENTATION COMMIT

Do **not** commit the documentation before human review.

After the human reviews and explicitly approves `AGENTS.md`, `ARCHITECTURE.md`, and `TASKS.md`:

1. inspect:
   ```bash
   git status
   git diff -- AGENTS.md ARCHITECTURE.md TASKS.md
   ```
2. verify there are no accidental application-source changes;
3. stage ONLY:
   ```bash
   git add AGENTS.md ARCHITECTURE.md TASKS.md
   ```
4. inspect the staged content:
   ```bash
   git diff --cached --stat
   git diff --cached
   ```
   `git diff --cached --stat` must show only:
   - `AGENTS.md`
   - `ARCHITECTURE.md`
   - `TASKS.md`
5. if any other file is staged, remove it from the staged set safely with:
   ```bash
   git restore --staged <file>
   ```
   This removes the file from the index only and does not modify its contents. Then re-check the staged diff;
6. create exactly one separate documentation commit:
   ```text
   docs: add project control documents
   ```
4. do not mix this documentation commit with P1.3 or another application task.

Before human review:

```text
Commit: PENDING HUMAN REVIEW
```

---

# 21. FINAL RESPONSE FOR THIS DOCUMENTATION TASK

After creating/updating the three documentation files, report:

```text
Documentation task prepared for human review.

Created/updated:
- AGENTS.md
- ARCHITECTURE.md
- TASKS.md

Application source modified:
NO

Files deleted:
NONE

Files renamed:
NONE

Files moved:
NONE

Discovery findings:
[short summary]

14-bug mapping:
[summary, including any UNMAPPED items]

Important uncertainties:
[list]

Contradictions:
[list, or NONE]

Commit:
PENDING HUMAN REVIEW

Next recommended action:
Start P1.1 read-only discovery.
```

Do not claim the application is fixed.

Do not claim tests passed unless tests were actually executed.
