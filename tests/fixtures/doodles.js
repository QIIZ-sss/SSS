// Deterministic 28x28 test doodles (0 = background, 1 = stroke) for Solo AI tests. No randomness.
const N = 28;
const blank = () => new Array(N * N).fill(0);
function line(px, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
    if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = 1;
  }
}
function arc(px, cx, cy, r, from = 0, to = 360) {
  let prev = null;
  for (let a = from; a <= to; a += 4) {
    const p = [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    if (prev) line(px, prev[0], prev[1], p[0], p[1]);
    prev = p;
  }
}
const doodles = {
  Sun: () => { const p = blank(); arc(p, 14, 14, 5); for (let a = 0; a < 360; a += 45) { const r = a * Math.PI / 180; line(p, 14 + 7 * Math.cos(r), 14 + 7 * Math.sin(r), 14 + 11 * Math.cos(r), 14 + 11 * Math.sin(r)); } return p; },
  Clock: () => { const p = blank(); arc(p, 14, 14, 10); line(p, 14, 14, 14, 7); line(p, 14, 14, 19, 14); return p; },
  House: () => { const p = blank(); line(p, 6, 13, 22, 13); line(p, 6, 13, 6, 24); line(p, 22, 13, 22, 24); line(p, 6, 24, 22, 24); line(p, 4, 14, 14, 4); line(p, 14, 4, 24, 14); line(p, 12, 24, 12, 18); line(p, 16, 24, 16, 18); line(p, 12, 18, 16, 18); return p; },
};
// Deterministic "scribble" noise (linear congruential generator, fixed seed)
function noise(seed, dots = 120) {
  const p = blank(); let s = seed >>> 0;
  for (let i = 0; i < dots; i++) { s = (s * 1664525 + 1013904223) >>> 0; p[s % (N * N)] = 1; }
  return p;
}
module.exports = { N, blank, doodles, noise };
