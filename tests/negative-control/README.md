# Negative controls

These scripts run the **current** tests against **old commits** to show the tests really detect the original bugs.
They are **expected to fail** against those commits, so they are **not** part of `tests/check_all.sh`.

```bash
node tests/negative-control/run.js            # all cases
node tests/negative-control/run.js harness    # one case: harness | d2 | b2
```

| Case | Old commit | Bug the test should catch | Needs |
|---|---|---|---|
| `harness` | `853c0be` (before P1.3) | Round 4/3, no GAME_OVER → LOBBY, stale ROUND_OVER timeout | Node only |
| `d2` | `36c2e47` (before D2) | eraser paints white over strokes; single canvas | Chrome |
| `b2` | `32d371d` (before B2) | header overflows at 375 px | Chrome + network (Tailwind CDN) |

Output per case:

- `EXPECTED FAIL` — good: the test fails on the old code.
- `UNEXPECTED PASS` — the test no longer detects the bug; the script exits with code 1.
- `SKIP` — Chrome not found (set `CHROME_PATH`).

The old sources are extracted with `git archive` into `tests/.tmp/negative-control/` (git-ignored). You need the git history that contains these commits.
