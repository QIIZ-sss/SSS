#!/usr/bin/env bash
# JUST DRAW IT regression suite. Run from anywhere: tests/check_all.sh
# Env: TEST_PORT (default 4100), TEST_TMP (default tests/.tmp), CHROME_PATH, KEEP_TMP=1 (keep generated files),
#      E2E="a2-game-over p2.1-ready" (run only these e2e files, without the .e2e.js suffix)
set -u
TESTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$TESTS/.." && pwd)"
export TEST_PORT="${TEST_PORT:-4100}"
export TEST_TMP="${TEST_TMP:-$TESTS/.tmp}"
mkdir -p "$TEST_TMP"

PASS=0; FAIL=0; SKIP=0
ok()   { echo "PASS  $1"; PASS=$((PASS + 1)); }
bad()  { echo "FAIL  $1"; FAIL=$((FAIL + 1)); }
skip() { echo "SKIP  $1"; SKIP=$((SKIP + 1)); }
# run_case <label> <command...>: exit 0 = PASS, 3 = SKIPPED, other = FAIL (prints the case's last line / failures)
run_case() {
  local label="$1"; shift
  local log="$TEST_TMP/case.log"
  "$@" > "$log" 2>&1; local code=$?
  local summary; summary="$(grep -E '[0-9]+/[0-9]+ PASS|^SKIPPED' "$log" | tail -1)"
  if [ $code -eq 0 ]; then ok "$label  ${summary}"
  elif [ $code -eq 3 ]; then skip "$label  ${summary}"
  else bad "$label  ${summary}"; grep -E '^FAIL|Error' "$log" | head -5 | sed 's/^/        /'; fi
}

for dep in server/node_modules client/node_modules; do
  [ -d "$ROOT/$dep" ] || { echo "Missing $dep — run: (cd ${dep%/node_modules} && npm ci)"; exit 2; }
done

echo "=== [1] syntax (node --check: live server + shared)"
SYNTAX_OK=1
for f in "$ROOT"/server/src/server.js "$ROOT"/server/src/gameLogic/*.js "$ROOT"/server/src/socket/gameHandler.js \
         "$ROOT"/server/src/socket/chatHandler.js "$ROOT"/server/src/socket/drawHandler.js "$ROOT"/server/src/utils/aiPredictor.js \
         "$ROOT"/server/src/config/database.js "$ROOT"/server/src/models/*.js "$ROOT"/shared/contract.js "$ROOT"/shared/events.js \
         "$ROOT"/shared/gameConfig.js "$ROOT"/shared/utils.js; do
  node --check "$f" 2>&1 || { echo "  syntax error: $f"; SYNTAX_OK=0; }
done
[ $SYNTAX_OK = 1 ] && ok "syntax" || bad "syntax"

echo "=== [2] shared contract loads (CJS require + ESM import)"
if (cd "$ROOT/server/src/gameLogic" && node -e "const c=require('../../../shared/contract'); if(c.GAME_RULES.GAME_OVER_DELAY_MS!==10000) process.exit(1)") \
   && (cd "$ROOT" && node --input-type=module -e "import {GAME_STATUS} from './shared/contract.js'; if(GAME_STATUS.LOBBY!=='LOBBY') process.exit(1)"); then
  ok "contract"
else bad "contract"; fi

echo "=== [3] state-machine harness (fake clock)"
run_case "harness/state-machine" node "$TESTS/harness/state-machine.harness.js"

echo "=== [4] client production build"
if (cd "$ROOT/client" && npx vite build --outDir "$TEST_TMP/client-dist" --emptyOutDir > "$TEST_TMP/build.log" 2>&1); then ok "client build"
else bad "client build"; tail -10 "$TEST_TMP/build.log"; fi

echo "=== [5] render tests (react-dom/server)"
for t in "$TESTS"/render/*.test.jsx; do run_case "render/$(basename "$t")" node "$TESTS/lib/render.js" "$t"; done

echo "=== [6] browser tests (headless Chrome)"
for t in "$TESTS"/browser/*.browser.jsx; do
  case "$t" in *b2-layout-overflow*) continue ;; esac   # needs the Tailwind CDN, run below
  run_case "browser/$(basename "$t" .browser.jsx)" env DEV=1 VTB=20000 CHROME_TIMEOUT=60000 node "$TESTS/lib/browser.js" "$t"
done
if curl -s -m 8 -o /dev/null https://cdn.tailwindcss.com/; then
  for w in 375 820; do
    run_case "browser/b2-layout-overflow@${w}px" \
      env FRAME_W=$w REAL_HEAD=1 VTB=25000 CHROME_TIMEOUT=120000 node "$TESTS/lib/browser.js" "$TESTS/browser/b2-layout-overflow.browser.jsx"
  done
else
  skip "browser/b2-layout-overflow (no network access to cdn.tailwindcss.com)"
fi

echo "=== [7] server on :$TEST_PORT + e2e (real socket.io clients)"
if lsof -ti ":$TEST_PORT" > /dev/null 2>&1; then
  bad "port $TEST_PORT is busy — not killing another process; free it or set TEST_PORT"
else
  (cd "$ROOT/server" && PORT="$TEST_PORT" exec node src/server.js > "$TEST_TMP/server.log" 2>&1) &
  SPID=$!
  for _ in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$TEST_PORT/api/leaderboard" && break; sleep 0.5; done
  if curl -s -o /dev/null "http://127.0.0.1:$TEST_PORT/api/leaderboard"; then
    ok "server startup on :$TEST_PORT"
    if [ -n "${E2E:-}" ]; then FILES=""; for n in $E2E; do FILES="$FILES $TESTS/e2e/$n.e2e.js"; done
    else FILES="$(ls "$TESTS"/e2e/*.e2e.js)"; fi
    for t in $FILES; do run_case "e2e/$(basename "$t")" node "$t"; done
  else
    bad "server startup on :$TEST_PORT"; tail -10 "$TEST_TMP/server.log"
  fi
  kill "$SPID" 2>/dev/null; wait "$SPID" 2>/dev/null
  if grep -qiE "TypeError|ReferenceError|Unhandled|SyntaxError" "$TEST_TMP/server.log"; then
    bad "server log has errors"; grep -iE "TypeError|ReferenceError|Unhandled|SyntaxError" "$TEST_TMP/server.log" | head -5
  else ok "server log clean"; fi
fi

echo "=== SUMMARY: $PASS passed, $FAIL failed, $SKIP skipped"
if [ "${KEEP_TMP:-}" != "1" ]; then rm -rf "$TEST_TMP"; fi
[ $FAIL -eq 0 ]
