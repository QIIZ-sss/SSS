// Browser-test runner: bundles a test file (real client components, stubbed socket) and runs it in headless Chrome
// with a throw-away profile under TEST_TMP. The test writes its result into <pre id="out">; we read it via --dump-dom.
//
// Usage: node tests/lib/browser.js <test.browser.jsx>
// Env:
//   CHROME_PATH    Chrome/Chromium binary (default: macOS Google Chrome path)
//   REAL_HEAD=1    use client/index.html <head> (Tailwind CDN + fonts — needs network access)
//   FRAME_W=375    run the page inside an iframe of that width (headless Chrome windows are >= 500 px wide)
//   DEV=1          bundle React in development mode (needed by tests that use act())
//   VTB            --virtual-time-budget in ms (default 5000); CHROME_TIMEOUT real timeout in ms (default 20000)
// Exit codes: 0 PASS, 1 FAIL, 3 SKIPPED (Chrome not found)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { CLIENT, TMP, STUB } = require('./paths');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SKIPPED = 3;

// Minimal stand-ins for the Tailwind utilities the canvas layout depends on (used when REAL_HEAD is not set)
const MIN_CSS = '.relative{position:relative}.absolute{position:absolute}.top-0{top:0}.left-0{left:0}.w-full{width:100%}'
  + '.h-full{height:100%}.isolate{isolation:isolate}.-z-10{z-index:-10}.overflow-hidden{overflow:hidden}'
  + '.aspect-\\[4\\/3\\]{aspect-ratio:4/3}.max-w-\\[640px\\]{max-width:640px}canvas{display:block}';

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.log(`SKIPPED  Chrome not found at "${CHROME}" (set CHROME_PATH)`);
    process.exit(SKIPPED);
  }
  const esbuild = require(path.join(CLIENT, 'node_modules', 'esbuild'));
  const entry = path.resolve(process.argv[2]);
  const outDir = path.join(TMP, 'browser');
  fs.mkdirSync(outDir, { recursive: true });
  const js = path.join(outDir, path.basename(entry) + '.js');
  await esbuild.build({
    entryPoints: [entry], bundle: true, platform: 'browser', format: 'iife', outfile: js,
    jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'empty' },
    nodePaths: [path.join(CLIENT, 'node_modules')], logLevel: 'error',
    define: { 'process.env.NODE_ENV': process.env.DEV ? '"development"' : '"production"' },
    plugins: [{ name: 'stub-socket', setup(b) { b.onResolve({ filter: /services\/socket$/ }, () => ({ path: STUB })); } }],
  });

  const html = path.join(outDir, path.basename(entry) + '.html');
  let head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${MIN_CSS}</style>`;
  let bodyAttr = '';
  if (process.env.REAL_HEAD) {
    const idx = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
    head = idx.slice(idx.indexOf('<head>') + 6, idx.indexOf('</head>'));
    bodyAttr = ' class="bg-arcade-dots text-on-surface font-body-md min-h-screen"';
  }
  fs.writeFileSync(html, `<!doctype html><html><head>${head}</head><body${bodyAttr}><div id="root"></div>`
    + `<pre id="out" style="white-space:pre-wrap">PENDING</pre><script src="${path.basename(js)}"></script></body></html>`);

  let dom = '';
  try {
    dom = execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${path.join(TMP, 'chrome-profile')}`, '--allow-file-access-from-files',
      `--virtual-time-budget=${process.env.VTB || '5000'}`, '--window-size=1280,900', '--dump-dom',
      'file://' + html + (process.env.FRAME_W ? '?w=' + process.env.FRAME_W : ''),
    ], { encoding: 'utf8', timeout: Number(process.env.CHROME_TIMEOUT || 20000), killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    dom = e.stdout || ''; // headless Chrome sometimes keeps running after --dump-dom; the DOM is already printed
  }
  const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
  const text = m
    ? m[1].replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'NO OUTPUT';
  console.log(text);
  process.exit(/FAIL|PENDING|NO OUTPUT/.test(text) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
