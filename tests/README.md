# Regression tests

Automated checks for the live game (`server/src/server.js` + `client/src/App.jsx`). No extra dependencies: the suite
uses what is already in `server/node_modules` and `client/node_modules` (socket.io-client, esbuild from Vite, React),
plus an installed Google Chrome for the browser tests.

## Prerequisites

1. Node.js (tested on v24.18.0). The shared files are loaded with `require()` of ES-module syntax, which needs a recent Node (22.12+ / 20.19+).
2. Dependencies installed once:
   ```bash
   (cd server && npm ci)
   (cd client && npm ci)
   ```
3. Port **4100** free. The suite starts its own server there and only stops that process. Port 4000 (your dev server) is not touched.
4. Optional: Google Chrome for browser tests. Default path is the macOS one; set `CHROME_PATH` for another location (e.g. `CHROME_PATH=/usr/bin/google-chrome`). Without Chrome, browser tests are reported as **SKIP**, not FAIL.
5. Optional: network access to `https://cdn.tailwindcss.com` for the layout test (`b2-layout-overflow`). Without it that test is reported as **SKIP**.

## Run

```bash
tests/check_all.sh
```

Takes about 12–13 minutes on the reference Mac (e2e use real timers, e.g. the reconnect test waits for the 30 s grace period; the Tailwind layout test loads the CDN). Use `E2E=...` to run a subset. Exit code 0 only if nothing failed.

Useful variables:

| Variable | Default | Meaning |
|---|---|---|
| `TEST_PORT` | `4100` | port for the test server |
| `TEST_TMP` | `tests/.tmp` | where logs, bundles, the Chrome profile and the client build go (git-ignored) |
| `KEEP_TMP=1` | off | keep `TEST_TMP` after the run (otherwise it is deleted) |
| `E2E="a2-game-over p3.1-answer-leak"` | all | run only these e2e files (names without `.e2e.js`) |
| `CHROME_PATH` | macOS Chrome | Chrome / Chromium binary |

Single files can also be run directly, e.g. `node tests/lib/render.js tests/render/b3-pin-logic.test.jsx` or `node tests/lib/browser.js tests/browser/d3-challenge-popup.browser.jsx` (browser tests bundle React in development mode by default, which `act()` needs; `DEV=0` gives a production bundle), or an e2e file while a server runs on `TEST_PORT` (`cd server && PORT=4100 node src/server.js`).

## What runs

| Step | Files | Needs | What it proves |
|---|---|---|---|
| syntax | live server + `shared/` | Node | files parse |
| contract | `shared/contract.js` | Node | loads with CJS `require` and ESM `import` |
| harness | `harness/state-machine.harness.js` | Node | state machine with a fake clock: no Round 4/3, GAME_OVER → LOBBY after 10 s, stale timeouts cleared |
| client build | `vite build` into `TEST_TMP` | Node | client compiles |
| render | `render/*.test.jsx` via `lib/render.js` | Node | component markup and pure logic (answer reveal, chat lock, canvas markup, mobile order, PIN rules, default name, avatars) |
| browser | `browser/*.browser.jsx` via `lib/browser.js` | **Chrome** | real DOM / canvas: eraser + pointer scaling (D2, B1), PIN typing / paste (B3), reconnect client flow (B4), difficulty setting (D1), challenge popup (D3), no Fill during Don't Lift Pen (QA-4), Solo AI client (A8/A9) |
| browser layout | `browser/*overflow*.browser.jsx`, `browser/*viewport*.browser.jsx` | **Chrome + network** (Tailwind CDN) | B2: no horizontal overflow on 9 screens at 375 px and 820 px; T1-06: chat wraps long words and scrolls inside a bounded list; T1-17: main action visible on first load, no empty band in the lobby cards |
| e2e | `e2e/*.e2e.js` against a real server on `TEST_PORT` | Node | A2, P2.1–P2.5, P3.1, P3.2, B4, D1, W1, QA-1 (`select_word` validation), SEC-2 (malformed payloads never crash the server), QA-4 (no `draw_fill` during Don't Lift Pen), Solo single-player room, A8/A9 with real socket.io clients; A8/A9 also loads the real DoodleNet model in-process |
| live UI | `e2e/*.live.jsx` via `lib/browser.js` with `LIVE_SOCKET=1` | **Chrome** | the real `App` UI in headless Chrome talking to the real test server (no stub): D1 — host clicks a difficulty in Settings, presses START, every word offered during a full match is checked. Not run with `E2E=…`; run without `LIVE_SOCKET=1` it reports SKIPPED |

Render and browser tests replace `client/src/services/socket.js` with `lib/socket-stub.js`; they are not end-to-end.
The A8/A9 "correct drawing scores +500" check only runs when a Solo turn's random target is Sun or Clock within 10 turns; otherwise the e2e prints `INFO … not exercised` and does not count it (the in-process model checks always run).
None of this replaces the MANUAL checks in `TASKS.md` (real phones / iPad, real refresh, LAN with several devices).

## Negative controls

`tests/negative-control/` runs the current tests against old commits and is **expected to fail** there. It is not part of `check_all.sh`. See `tests/negative-control/README.md`.

## Layout

```
tests/
  check_all.sh             entry point
  lib/                     paths, e2e helpers, socket stub, render/browser runners
  harness/                 fake-clock state-machine harness
  render/                  react-dom/server tests
  browser/                 headless Chrome tests
  e2e/                     real server + socket.io client tests
  fixtures/                deterministic 28×28 doodles for Solo AI tests
  negative-control/        expected-to-fail runs against old commits
```
