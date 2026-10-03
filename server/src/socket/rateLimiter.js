// U4: per-socket, in-memory rate limits (sliding window) from RATE_LIMITS in shared/contract.js.
// Over the limit the event is dropped silently: no handler runs, no ack, no error, no disconnect.
const { SOCKET_EVENTS } = require('../../../shared/events');
const { RATE_LIMITS } = require('../../../shared/contract');

// event name -> RATE_LIMITS key (all drawing events share the DRAW limit)
const LIMIT_OF = new Map();
Object.keys(RATE_LIMITS).forEach((key) => {
  if (key === 'DRAW') RATE_LIMITS.DRAW.events.forEach((ev) => LIMIT_OF.set(SOCKET_EVENTS[ev], key));
  else LIMIT_OF.set(SOCKET_EVENTS[key], key);
});

function attachRateLimit(socket) {
  const recent = {}; // RATE_LIMITS key -> timestamps inside the window
  socket.use((packet, next) => {
    const key = LIMIT_OF.get(packet[0]);
    if (!key) return next();
    const { max, windowMs } = RATE_LIMITS[key];
    const now = Date.now();
    const list = recent[key] || (recent[key] = []);
    while (list.length && now - list[0] >= windowMs) list.shift();
    if (list.length >= max) return; // dropped
    list.push(now);
    next();
  });
}

module.exports = { attachRateLimit };
