# AGENTS.md — JUST DRAW IT operational rules

Global rules for every agent and every task. Details live in `ARCHITECTURE.md` (what exists) and `TASKS.md` (what to do).

**Governing rule: FIX THE TASK, NOT THE WHOLE PROJECT.**

## 1. Live code only

- Edit only code reachable from the live entry points:
  - Server: `server/src/server.js` (run by `npm start` / `npm run dev`)
  - Client: `client/index.html` → `client/src/index.jsx` → `client/src/App.jsx`
- Dead/legacy code (listed in `ARCHITECTURE.md` §2.3) must not be edited, imported, revived, or deleted unless a task explicitly authorizes it.
- Before editing a file, confirm it is imported by the live path (search the `require`/`import` chain).

## 2. Minimal change

Make the smallest safe change that satisfies the requirement. For an ordinary small fix, report:

```text
Changed:
Reason:
Files:
```

### Approval-required changes (explain, then STOP)

Any of the following requires the block below **and explicit human approval before implementing**:

1. modifying anything under `shared/`;
2. changing a Socket.io event name;
3. changing a Socket.io payload structure, field name, meaning, or direction;
4. renaming or moving files;
5. creating a new folder;
6. modifying more than 3 application source files;
7. introducing a new architectural layer;
8. replacing an existing implementation.

```text
Problem:
Root cause:
Why a smaller fix is insufficient:
Files affected:
Impact:
```

Do not write the justification and continue automatically.

## 3. Source of truth / no hardcoding

1. Search the repository before adding any constant.
2. Reuse the existing shared value if one exists.
3. Create a new constant only for a genuinely missing concept.

Client may read shared values for UX (e.g. disabling START); the server enforces the same shared value and is authoritative. The client must never define a competing value. Note: `shared/contract.js` is **not yet imported at runtime** (see `ARCHITECTURE.md` §4) — do not assume it is in effect.

## 4. Socket contract

Search all usages (client, server, `qa/`) before touching an event or payload. Any change to the socket contract requires approval (§2).

## 5. Security

Never trust the client for: game state, role, drawer identity, score, correct answer, readiness, host permission, game start, round transitions, challenge enforcement. Client restrictions are UX only. The server must not send secret data (e.g. `currentWord`) to clients not allowed to see it.

## 6. Task workflow

1. **Discover** — read the actual implementation and relevant tests for this task.
2. **Confirm scope** — requirement IDs, allowed files, acceptance criteria (from `TASKS.md`).
3. **Approval gate** — if §2 is triggered, explain and STOP.
4. **Implement** — smallest change.
5. **Test** — run the relevant tests; never invent results.
6. **Inspect diff** — `git status` and `git diff`; remove unrelated changes.
7. **Commit** — one focused commit per task, after verification, e.g. `fix(P1.3): fix game over transition`.

## 7. Solo AI

Solo AI uses the existing DoodleNet model (`server/src/utils/aiPredictor.js`, `server/src/ai_model/`). Do not replace it with fake AI, random/heuristic guessing, another API/model, fake confidence, or hardcoded predictions. The existing `heuristicFallback()` / `Math.random` path is a known defect to be removed by A8/A9 — fixing it is in scope for those tasks; it is not protected code.

## 8. Evidence

- Never report PASS / FIXED / VERIFIED unless actually tested in this repository state.
- Untestable items are marked `MANUAL` or `NOT TESTED`.
- Never fabricate screenshots, logs, measurements, or results.
- Existing `qa/QA_REPORT.md` results are DOCUMENTATION CLAIMS; many were hardcoded `PASS` in scripts. Re-verify before relying on them.

## 9. Scope

Modify only the files approved for the task. If another file becomes necessary, STOP and request approval.

## 10. STOP conditions

STOP and ask the human when:

- any §2 approval-required change is triggered;
- replacing DoodleNet or deleting existing functionality;
- changing unrelated UI;
- acceptance criteria are ambiguous;
- implementation and specification contradict each other;
- the file to edit is not on the live code path.

## 11. Git

- One task = one branch (for parallel work) and one focused commit.
- Never run destructive commands (`git reset --hard`, `git checkout -- <file>`, `git clean`, force push) unless the human explicitly asks.
- Before committing, check for unrelated files, generated files, debug code, hardcoded values, accidental contract changes, deleted files.
