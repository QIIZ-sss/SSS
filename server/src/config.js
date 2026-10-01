import 'dotenv/config';

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  port: num(process.env.PORT, 3001),
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  jwtSecret: process.env.JWT_SECRET || '',
  sessionTtl: process.env.SESSION_TTL || '4h',

  // ตั๋วแอดมินใช้ความลับคนละตัวกับตั๋วผู้เล่น เพื่อให้สองระบบพังแยกกัน
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || '',
  adminSessionTtl: process.env.ADMIN_SESSION_TTL || '8h',

  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: process.env.DB_SSL === 'true',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  maxPlayersPublic: num(process.env.MAX_PLAYERS_PUBLIC, 10),
  maxPlayersPrivate: num(process.env.MAX_PLAYERS_PRIVATE, 25),

  maxStrokesPerSubmit: num(process.env.MAX_STROKES_PER_SUBMIT, 300),
  maxPointsPerSubmit: num(process.env.MAX_POINTS_PER_SUBMIT, 5000),

  // ผู้เล่นหลุดเน็ตแล้วกลับมาได้ภายในกี่มิลลิวินาที ก่อนจะถูกถอดออกจากห้อง
  reconnectGraceMs: 45_000,
  // ห้องว่างนานเท่าไรถึงถูกลบทิ้ง
  emptyRoomTtlMs: 5 * 60_000,
  // เผื่อเวลาให้ client ส่งงานหลังหมดเวลา
  submitGraceMs: 4_000,
};

// ห้ามสตาร์ตเซิร์ฟเวอร์จริงโดยไม่มี secret — ล้มตั้งแต่ตอนบูตดีกว่าไปพังตอนมีคนเล่น
if (config.isProd) {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET ต้องมีอย่างน้อย 32 ตัวอักษรเมื่อรันโหมด production');
  }
  if (!config.adminJwtSecret || config.adminJwtSecret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET ต้องมีอย่างน้อย 32 ตัวอักษรเมื่อรันโหมด production');
  }
  if (config.adminJwtSecret === config.jwtSecret) {
    throw new Error('ADMIN_JWT_SECRET ต้องไม่ซ้ำกับ JWT_SECRET');
  }
  if (config.corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGINS ห้ามเป็น * ในโหมด production');
  }
} else {
  if (!config.jwtSecret) {
    config.jwtSecret = 'dev-only-insecure-secret-do-not-ship-anywhere-32chars';
    console.warn('[config] ไม่พบ JWT_SECRET ใช้ค่า dev ชั่วคราว');
  }
  if (!config.adminJwtSecret) {
    config.adminJwtSecret = 'dev-only-insecure-admin-secret-do-not-ship-32chars';
    console.warn('[config] ไม่พบ ADMIN_JWT_SECRET ใช้ค่า dev ชั่วคราว');
  }
}
