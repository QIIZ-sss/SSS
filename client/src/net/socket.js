import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket = null;

/** ขอตั๋วผู้เล่นจากเซิร์ฟเวอร์ แล้วเปิดการเชื่อมต่อ */
export async function connect(nickname) {
  const res = await fetch(`${SERVER_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  }
  const session = await res.json();

  socket?.disconnect();
  socket = io(SERVER_URL, {
    auth: { token: session.token },
    transports: ['websocket'],
    reconnectionAttempts: 8,
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', (err) => reject(new Error(err.message)));
  });

  return { session, socket };
}

export function getSocket() {
  return socket;
}

/** ห่อ emit ให้เป็น Promise และแปลงคำตอบที่ไม่สำเร็จเป็น error */
export function ask(event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('ยังไม่ได้เชื่อมต่อ'));
    socket.timeout(8000).emit(event, payload, (timeoutErr, response) => {
      if (timeoutErr) return reject(new Error('เซิร์ฟเวอร์ไม่ตอบสนอง'));
      if (!response?.ok) return reject(new Error(response?.error || 'ทำรายการไม่สำเร็จ'));
      resolve(response);
    });
  });
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}
