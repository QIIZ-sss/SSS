// Render-test runner: bundles a test file (real client components) with esbuild from client/node_modules,
// replaces client/src/services/socket with tests/lib/socket-stub.js, and runs it in Node (react-dom/server).
// Usage: node tests/lib/render.js <test.jsx>
const path = require('path');
const fs = require('fs');
const { CLIENT, TMP, STUB } = require('./paths');

const esbuild = require(path.join(CLIENT, 'node_modules', 'esbuild'));

const stubSocket = {
  name: 'stub-socket',
  setup(build) {
    build.onResolve({ filter: /services\/socket$/ }, () => ({ path: STUB }));
  },
};

async function bundle(entry) {
  const outDir = path.join(TMP, 'render');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, path.basename(entry) + '.cjs');
  await esbuild.build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out,
    jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'empty' },
    nodePaths: [path.join(CLIENT, 'node_modules')], plugins: [stubSocket], logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return out;
}

module.exports = { bundle };

if (require.main === module) {
  bundle(path.resolve(process.argv[2]))
    .then((out) => require(out))
    .catch((e) => { console.error(e); process.exit(1); });
}
