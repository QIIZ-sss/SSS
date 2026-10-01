// Negative controls: run current tests against OLD commits to prove the tests detect the original bugs.
// These cases are EXPECTED TO FAIL against the listed commits. They are not part of check_all.sh.
//
// Usage: node tests/negative-control/run.js [harness|d2|b2 ...]   (default: all)
// Needs: git history (the commits below), client/node_modules; d2/b2 need Chrome; b2 needs network (Tailwind CDN).
const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const { ROOT, TMP, STUB } = require('../lib/paths');

const CASES = {
  harness: { commit: '853c0be', bug: 'A2 Round 4/3, no GAME_OVER→LOBBY, stale ROUND_OVER timeout (before P1.3)' },
  d2: { commit: '36c2e47', bug: 'white-paint eraser, single canvas (before D2)' },
  b2: { commit: '32d371d', bug: 'header overflows at 375 px (before B2)' },
};

function checkout(commit) {
  const dir = path.join(TMP, 'negative-control', commit);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    execSync(`git archive ${commit} client/src server/src shared | tar -x -C "${dir}"`, { cwd: ROOT, stdio: 'inherit', shell: '/bin/bash' });
  }
  return dir;
}

// Copy a browser test so that its client/src imports point at the old checkout
function retarget(testFile, oldDir) {
  const src = fs.readFileSync(testFile, 'utf8')
    .split("'../../client/src/").join(`'${path.join(oldDir, 'client', 'src')}/`)
    .split("'../lib/socket-stub.js'").join(`'${STUB}'`);
  const out = path.join(TMP, 'negative-control', path.basename(testFile));
  fs.writeFileSync(out, src);
  return out;
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const chosen = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
let unexpected = 0;
for (const name of chosen) {
  const c = CASES[name];
  if (!c) { console.log(`unknown case ${name}`); unexpected++; continue; }
  const dir = checkout(c.commit);
  let r;
  if (name === 'harness') {
    r = run('node', [path.join(ROOT, 'tests/harness/state-machine.harness.js')], { HARNESS_ROOT: dir });
  } else if (name === 'd2') {
    r = run('node', [path.join(ROOT, 'tests/lib/browser.js'), retarget(path.join(ROOT, 'tests/browser/d2-eraser-b1-pointer.browser.jsx'), dir)]);
  } else if (name === 'b2') {
    r = run('node', [path.join(ROOT, 'tests/lib/browser.js'), retarget(path.join(ROOT, 'tests/browser/b2-layout-overflow.browser.jsx'), dir)],
      { FRAME_W: '375', REAL_HEAD: '1', VTB: '25000', CHROME_TIMEOUT: '120000' });
  }
  const summary = (r.out.match(/\d+\/\d+ PASS/g) || ['no summary']).pop();
  const fails = r.out.split('\n').filter((l) => l.startsWith('FAIL')).slice(0, 4);
  if (r.code === 3) {
    console.log(`SKIP  ${name} @ ${c.commit} — ${r.out.trim()}`);
  } else if (r.code === 0) {
    console.log(`UNEXPECTED PASS  ${name} @ ${c.commit} (${summary}) — the test no longer detects: ${c.bug}`);
    unexpected++;
  } else {
    console.log(`EXPECTED FAIL  ${name} @ ${c.commit} (${summary}) — detects: ${c.bug}`);
    fails.forEach((l) => console.log('    ' + l));
  }
}
process.exit(unexpected ? 1 : 0);
