// T1-23: the Solo AI's drawings. DoodleNet can only recognise, not draw, and the repo has no stroke data, so each
// AI-draw word has a hand-made stroke template (canvas space 640 × 480, the client Canvas size). Everything is
// deterministic (fixed points and cos / sin, no random numbers). Playback sends one point per SOLO_AI.AI_STROKE_INTERVAL_MS through the existing
// draw_begin / draw_path / draw_end events, so the client renders it like a remote drawer, and records the same
// history entries as drawHandler (for draw_sync after a reload).
const { SOCKET_EVENTS } = require('../../../shared/events');
const { SOLO_AI } = require('../../../shared/contract');

const INK = '#18181B';
const SIZE = 6;
const round = (n) => Math.round(n);
// points on an arc (degrees, clockwise on screen because y grows downwards)
const arc = (cx, cy, r, from, to, steps) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
  return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
});
const circle = (cx, cy, r, steps = 24) => arc(cx, cy, r, 0, 360, steps);
const line = (x1, y1, x2, y2, steps = 4) => Array.from({ length: steps + 1 }, (_, i) => [round(x1 + ((x2 - x1) * i) / steps), round(y1 + ((y2 - y1) * i) / steps)]);
const poly = (...pts) => pts.slice(1).reduce((acc, p, i) => acc.concat(line(...pts[i], ...p, 3).slice(1)), [pts[0]]);
const stroke = (points, color = INK, size = SIZE) => ({ color, size, points });

const TEMPLATES = {
  Sun: [
    stroke(circle(320, 240, 70)),
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
      const a = (d * Math.PI) / 180;
      return stroke(line(320 + 95 * Math.cos(a), 240 + 95 * Math.sin(a), 320 + 150 * Math.cos(a), 240 + 150 * Math.sin(a), 3));
    }),
  ],
  House: [
    stroke(poly([220, 230], [220, 410], [420, 410], [420, 230], [220, 230])),
    stroke(poly([195, 235], [320, 110], [445, 235])),
    stroke(poly([295, 410], [295, 320], [345, 320], [345, 410])),
    stroke(poly([245, 260], [285, 260], [285, 295], [245, 295], [245, 260])),
  ],
  Tree: [
    stroke(poly([300, 430], [300, 300], [340, 300], [340, 430])),
    stroke(circle(320, 205, 105, 28)),
    stroke(poly([260, 430], [380, 430])),
  ],
  Apple: [
    stroke(arc(270, 270, 95, 100, 300, 14)),
    stroke(arc(370, 270, 95, -120, 80, 14)),
    stroke(poly([270, 362], [320, 345], [370, 362])),
    stroke(poly([320, 185], [328, 120])),
    stroke(arc(355, 130, 25, 150, 330, 8)),
  ],
  Clock: [
    stroke(circle(320, 240, 140, 28)),
    stroke(poly([320, 240], [320, 150])),
    stroke(poly([320, 240], [390, 240])),
    ...[0, 90, 180, 270].map((d) => {
      const a = (d * Math.PI) / 180;
      return stroke(line(320 + 115 * Math.cos(a), 240 + 115 * Math.sin(a), 320 + 132 * Math.cos(a), 240 + 132 * Math.sin(a), 1));
    }),
  ],
  Rainbow: [
    stroke(arc(320, 380, 230, 180, 360, 20), '#EF4444', 10),
    stroke(arc(320, 380, 200, 180, 360, 20), '#F97316', 10),
    stroke(arc(320, 380, 170, 180, 360, 20), '#EAB308', 10),
    stroke(arc(320, 380, 140, 180, 360, 20), '#22C55E', 10),
    stroke(arc(320, 380, 110, 180, 360, 20), '#3B82F6', 10),
  ],
  Car: [
    stroke(poly([140, 330], [140, 270], [230, 260], [270, 200], [400, 200], [450, 260], [500, 270], [500, 330], [140, 330])),
    stroke(poly([285, 210], [285, 260], [440, 260])),
    stroke(circle(220, 340, 38, 16)),
    stroke(circle(420, 340, 38, 16)),
  ],
};

// the ordered draw events of one template: [{ ev, data }]
function eventsFor(word) {
  const t = TEMPLATES[word];
  if (!t) return [];
  return t.flatMap(({ color, size, points }) => [
    { ev: SOCKET_EVENTS.DRAW_BEGIN, type: 'begin', data: { x: points[0][0], y: points[0][1], color, size, tool: 'pen' } },
    ...points.slice(1).map(([x, y]) => ({ ev: SOCKET_EVENTS.DRAW_PATH, type: 'path', data: { x, y, color, size, tool: 'pen' } })),
    { ev: SOCKET_EVENTS.DRAW_END, type: 'end', data: {} },
  ]);
}

const playing = new Map(); // room id -> interval handle

function stop(roomId) {
  const h = playing.get(roomId);
  if (h) { clearInterval(h); playing.delete(roomId); }
}

// Draw `word` into the room progressively; stops by itself when the turn is over (status / word changed or room gone)
function start(io, room, word, roomManager) {
  stop(room.id);
  const events = eventsFor(word);
  let i = 0;
  const h = setInterval(() => {
    const live = roomManager.getRoom(room.id) === room && room.status === 'PLAYING' && room.currentWord === word;
    if (!live || i >= events.length) { stop(room.id); return; }
    const { ev, type, data } = events[i++];
    room.drawingHistory.push({ type, ...data, timestamp: Date.now() });
    io.to(room.id).emit(ev, data);
  }, SOLO_AI.AI_STROKE_INTERVAL_MS);
  playing.set(room.id, h);
}

module.exports = { TEMPLATES, eventsFor, start, stop };
