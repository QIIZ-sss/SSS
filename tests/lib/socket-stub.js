// Stand-in for client/src/services/socket.js in render/browser tests (records emits, lets tests fire handlers / acks).
export const handlers = {};
export const emitted = [];
export const responders = {}; // ev -> (data) => ack payload
export const socket = {
  on: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); },
  off: (ev, fn) => { if (handlers[ev]) handlers[ev] = handlers[ev].filter(f => f !== fn); },
  emit: (ev, data, cb) => { emitted.push({ ev, data }); if (typeof cb === 'function' && responders[ev]) cb(responders[ev](data)); },
  connected: true, connect() {},
};
export const connectSocket = () => {};
export const disconnectSocket = () => {};
