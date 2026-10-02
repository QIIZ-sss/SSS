// Browser-test runner: bundles a test file (real client components, stubbed socket) and runs it in headless Chrome
// with a throw-away profile under TEST_TMP. The test writes its result into <pre id="out">; we read it via --dump-dom.
//
// Usage: node tests/lib/browser.js <test.browser.jsx>
// Env:
//   CHROME_PATH    Chrome/Chromium binary (default: macOS Google Chrome path)
//   REAL_HEAD=1    use client/index.html <head> (Tailwind CDN + fonts — needs network access)
//   FRAME_W=375    run the page inside an iframe of that width (headless Chrome windows are >= 500 px wide)
//   DEV=0          bundle React in production mode (default: development, which act() needs)
//   LIVE_SOCKET=1  use lib/socket-live.js (real socket.io to the test server on TEST_PORT) instead of the stub;
//                  the page is served over http://127.0.0.1, runs in real time and POSTs its result (CHROME_TIMEOUT = max wait)
//   PAGE_QUERY     extra query string for the test page (e.g. level=HARD)
//   VTB            --virtual-time-budget in ms (default 5000); CHROME_TIMEOUT real timeout in ms (default 20000)
// Exit codes: 0 PASS, 1 FAIL, 3 SKIPPED (Chrome not found)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const { CLIENT, TMP, STUB } = require('./paths');
const LIVE = path.join(__dirname, 'socket-live.js');

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
  // *.live.jsx pages need the real server (LIVE_SOCKET=1, as check_all.sh sets); with the stub they cannot pass
  if (/\.live\.jsx$/.test(entry) && !process.env.LIVE_SOCKET) {
    console.log('SKIPPED  live UI test needs LIVE_SOCKET=1 and a server on TEST_PORT (see tests/README.md)');
    process.exit(SKIPPED);
  }
  const outDir = path.join(TMP, 'browser');
  fs.mkdirSync(outDir, { recursive: true });
  const js = path.join(outDir, path.basename(entry) + '.js');
  await esbuild.build({
    entryPoints: [entry], bundle: true, platform: 'browser', format: 'iife', outfile: js,
    jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'empty' },
    nodePaths: [path.join(CLIENT, 'node_modules')], logLevel: 'error',
    define: {
      'process.env.NODE_ENV': process.env.DEV === '0' ? '"production"' : '"development"',
      'process.env.TEST_PORT': JSON.stringify(process.env.TEST_PORT || '4100'),
    },
    plugins: [{ name: 'stub-socket', setup(b) { b.onResolve({ filter: /services\/socket$/ }, () => ({ path: process.env.LIVE_SOCKET ? LIVE : STUB })); } }],
  });

  const html = path.join(outDir, path.basename(entry) + '.html');
  let head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${MIN_CSS}</style>`;
  let bodyAttr = '';
  if (process.env.REAL_HEAD) {
    const idx = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
    head = idx.slice(idx.indexOf('<head>') + 6, idx.indexOf('</head>'));
    bodyAttr = ' class="bg-arcade-dots text-on-surface font-body-md min-h-screen"';
  }
  // Live pages POST every change of #out back to the runner (no reliance on --dump-dom timing)
  const reportHook = process.env.LIVE_SOCKET
    ? `<script>new MutationObserver(() => fetch('/result', { method: 'POST', body: document.getElementById('out').textContent }))`
      + `.observe(document.getElementById('out'), { childList: true, characterData: true, subtree: true });</script>`
    : '';
  fs.writeFileSync(html, `<!doctype html><html><head>${head}</head><body${bodyAttr}><div id="root"></div>`
    + `<pre id="out" style="white-space:pre-wrap">PENDING</pre>${reportHook}<script src="${path.basename(js)}"></script></body></html>`);

  // LIVE_SOCKET pages are served over http://127.0.0.1 (Chrome blocks file:// pages from reaching the local test server)
  let pageServer = null;
  let liveResult = null;
  let chromeChild = null;
  let pageUrl = 'file://' + html;
  if (process.env.LIVE_SOCKET) {
    pageServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/result') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => { liveResult = body; res.end('ok'); if (!/^PENDING/.test(body) && chromeChild) chromeChild.kill('SIGKILL'); });
        return;
      }
      const file = path.join(outDir, path.basename(decodeURIComponent(req.url.split('?')[0])));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
        res.end(data);
      });
    });
    await new Promise((r) => pageServer.listen(0, '127.0.0.1', r));
    pageUrl = `http://127.0.0.1:${pageServer.address().port}/${path.basename(html)}`;
  }
  const query = [process.env.FRAME_W ? 'w=' + process.env.FRAME_W : '', process.env.PAGE_QUERY || ''].filter(Boolean).join('&');
  const args = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${path.join(TMP, 'chrome-profile')}`, '--allow-file-access-from-files',
    // live tests talk to a real server, so they wait in real time (--timeout) instead of virtual time
    ...(process.env.LIVE_SOCKET ? [] : [`--virtual-time-budget=${process.env.VTB || '5000'}`, '--dump-dom']),
    '--window-size=1280,900', pageUrl + (query ? '?' + query : ''),
  ];
  // Async spawn so the page server above can answer while Chrome runs.
  // Headless Chrome sometimes keeps running after --dump-dom; the DOM is already printed, so kill it at the timeout.
  const dom = await new Promise((resolve) => {
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    chromeChild = child;
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    const killer = setTimeout(() => child.kill('SIGKILL'), Number(process.env.CHROME_TIMEOUT || 20000));
    child.on('close', () => { clearTimeout(killer); resolve(stdout); });
  });
  if (pageServer) pageServer.close();
  if (process.env.LIVE_SOCKET) {
    const text = liveResult || 'NO OUTPUT';
    console.log(text);
    process.exit(/FAIL|PENDING|NO OUTPUT/.test(text) ? 1 : 0);
  }
  const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
  const text = m
    ? m[1].replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'NO OUTPUT';
  console.log(text);
  process.exit(/FAIL|PENDING|NO OUTPUT/.test(text) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
