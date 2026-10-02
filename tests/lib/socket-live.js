// Stand-in for client/src/services/socket.js in "live" browser tests: a REAL socket.io connection to the test
// server (TEST_PORT, default 4100) instead of the stub, so the real UI talks to the real server.
import { io } from 'socket.io-client';

const PORT = process.env.TEST_PORT || '4100';
export const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'], autoConnect: true, reconnection: true });
export const connectSocket = () => { if (!socket.connected) socket.connect(); };
export const disconnectSocket = () => { if (socket.connected) socket.disconnect(); };
