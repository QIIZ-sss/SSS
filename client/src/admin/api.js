const BASE = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api/admin';

/**
 * ทุกคำขอส่ง credentials ไปด้วยเพราะเซสชันแอดมินอยู่ในคุกกี้แบบ httpOnly
 * และแนบ header X-Admin-Request ทุกครั้ง — เว็บอื่นตั้ง header นี้ข้ามโดเมนไม่ได้
 * จึงเป็นด่านกัน CSRF ที่ทำงานคู่กับ SameSite=strict ฝั่งเซิร์ฟเวอร์
 */
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: {
      'X-Admin-Request': '1',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* บาง response ไม่มี body */
  }

  if (!res.ok) {
    const err = new Error(data.error || `คำขอล้มเหลว (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) => request('/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),

  stats: () => request('/stats'),
  rooms: () => request('/rooms'),
  closeRoom: (code) => request(`/rooms/${code}/close`, { method: 'POST' }),

  reports: (status = 'open') => request(`/reports?status=${status}`),
  resolveReport: (id, payload) => request(`/reports/${id}/resolve`, { method: 'POST', body: payload }),

  games: (offset = 0) => request(`/games?offset=${offset}`),
  game: (id) => request(`/games/${id}`),
  removeDrawing: (id, note) => request(`/drawings/${id}/remove`, { method: 'POST', body: { note } }),

  bans: () => request('/bans'),
  liftBan: (id) => request(`/bans/${id}`, { method: 'DELETE' }),

  audit: () => request('/audit'),

  admins: () => request('/admins'),
  createAdmin: (payload) => request('/admins', { method: 'POST', body: payload }),
};
