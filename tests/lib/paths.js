// Shared locations for the test suite. Everything generated goes under TEST_TMP (default tests/.tmp, git-ignored).
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT = path.join(ROOT, 'client');
const TMP = process.env.TEST_TMP ? path.resolve(process.env.TEST_TMP) : path.join(ROOT, 'tests', '.tmp');
const STUB = path.join(__dirname, 'socket-stub.js');

module.exports = { ROOT, CLIENT, TMP, STUB };
