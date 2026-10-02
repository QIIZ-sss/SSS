# qa/ — legacy QA scripts (not maintained)

This folder holds the QA scripts and report written **before** the current control documents
(`AGENTS.md`, `ARCHITECTURE.md`, `TASKS.md`). They are kept for history only.

**The maintained regression suite is `tests/`**, run with:

```bash
./tests/check_all.sh
```

See `tests/README.md` for what it covers.

## Why these scripts are not trusted

- Many cases assign a literal `status: 'PASS'` without a real assertion (examples listed in `ARCHITECTURE.md` §16,
  e.g. `test_nw_cases.js` NW-07…NW-10, `test_drawing_eraser.js` C-01…C-08, `test_modes_and_ui.js` UI-01…UI-03,
  `test_sec_cases.js` SEC-04/SEC-05). The results in `QA_REPORT.md` are therefore **documentation claims**, not
  evidence (`AGENTS.md` §8).
- They expect a server on port 4000 and a client on 5173, and `package.json` `"test"` points to a
  `test_runner.js` that does not exist.
- Some scripts select hardcoded target words (`test_sec_cases.js` → `Elephant`, `test_chat_scoring.js` → `Guitar`,
  `test_modes_and_ui.js` → `House`). Since `fix(security): validate select_word` the server only accepts a word
  that was offered to the drawer this turn, so these selections are ignored and the scripts may stall in
  `WORD_SELECTION` or report failures. This is expected and is not a regression. (Not re-run; noted from the code.)
- Behaviour has changed since they were written (answer leak, Ready / player-count rules, reconnect, D1–D3, A8/A9,
  W1, Solo single-player room), so even scripts that still run may check outdated behaviour.

## Rules

- Do not rely on `qa/` results; re-verify with `tests/` or a manual test.
- The scripts are not edited or deleted; new automated checks go into `tests/`.
